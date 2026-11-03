import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createHash, createHmac, randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import { handleAttendance, validateAttendee, validateEvent, createSession, rosterCsv } from '../server/attendance.js'

const source = await readFile(new URL('../google-apps-script/Attendance.gs', import.meta.url), 'utf8')
const seed = JSON.parse(await readFile(new URL('../shared/attendance-events.json', import.meta.url), 'utf8'))
let now = Date.parse('2026-10-22T14:00:00Z')
const props = { ATTENDANCE_SHARED_SECRET: 'test-only-secret-that-is-long-and-never-deployed', ATTENDANCE_SHEET_ID: 'mock-sheet', ATTENDANCE_EMAIL_MODE: 'disabled' }
let failTable = '', mailFails = false, lockHeld = false, lockUses = 0
const mailed = [], sheets = new Map()
class Sheet {
  constructor(name) { this.name = name; this.rows = [] }
  getLastRow() { let last = this.rows.length; while (last && !this.rows[last - 1]?.some(value => value !== '')) last--; return last }
  getMaxRows() { return 100000 }
  insertRowsAfter() {}
  setFrozenRows() {}
  getRange(row, column, height = 1, width = 1) {
    return {
      getValues: () => Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => this.rows[row + r - 1]?.[column + c - 1] ?? '')),
      setValues: values => {
        if (failTable === this.name) { failTable = ''; throw Error('Injected partial spreadsheet outage') }
        for (let r = 0; r < height; r++) { this.rows[row + r - 1] ||= []; for (let c = 0; c < width; c++) this.rows[row + r - 1][column + c - 1] = values[r][c] }
      },
      clearContent: () => { for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) if (this.rows[row + r - 1]) this.rows[row + r - 1][column + c - 1] = '' },
    }
  }
}
const spreadsheet = { getSheetByName: name => sheets.get(name), insertSheet: name => { const sheet = new Sheet(name); sheets.set(name, sheet); return sheet } }
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
const context = vm.createContext({
  console, Date: ClockDate,
  PropertiesService: { getScriptProperties: () => ({ getProperty: key => props[key] || null, setProperty: (key, value) => { props[key] = value } }) },
  Utilities: {
    getUuid: randomUUID, DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (_algorithm, value) => [...createHash('sha256').update(value).digest()],
    computeHmacSha256Signature: (value, secret) => [...createHmac('sha256', secret).update(value).digest()],
    formatDate: (date, timeZone, pattern) => pattern === 'yyyy-MM-dd' ? new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
      : pattern === 'Z' ? new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date).find(part => part.type === 'timeZoneName').value.replace(/^GMT([+-]\d\d):(\d\d)$/, '$1$2')
      : new Intl.DateTimeFormat('en-CA', { timeZone, ...(pattern.startsWith('EEEE') ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : pattern.startsWith('MMMM') ? { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : { hour: 'numeric', minute: '2-digit', ...(pattern.includes('z') ? { timeZoneName: 'short' } : {}) }) }).format(date),
  },
  SpreadsheetApp: { openById: () => spreadsheet, flush: () => {} },
  LockService: { getScriptLock: () => ({ waitLock: () => { assert(!lockHeld); lockHeld = true; lockUses++ }, tryLock: () => { if (lockHeld) return false; lockHeld = true; lockUses++; return true }, releaseLock: () => { lockHeld = false } }) },
  MailApp: { sendEmail: mail => { if (mailFails) throw Error('Mock quota exceeded'); mailed.push(mail) }, getRemainingDailyQuota: () => 100 },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
})
vm.runInContext(source, context)
context.setupAttendance()
assert.deepEqual(JSON.parse(JSON.stringify(context.attendanceEventSeed_())), seed)
let ipSequence = 0
const client = () => createHash('sha256').update(`client-${ipSequence++}`).digest('hex')
function call(action, fields = {}, actor = {}) {
  return context.doPost({ parameter: { secret: props.ATTENDANCE_SHARED_SECRET, payload: JSON.stringify({ action, ...fields, actor, clientKey: client() }) } })
}
const person = (email, extra = {}) => ({ firstName: 'Test', lastName: 'Attendee', email, category: 'undergraduate', institution: 'UWindsor', faculty: 'Engineering', organisation: '', role: '', withTeam: false, teamName: '', dietary: '', accessibility: '', referral: '', ...extra })
const submission = (email, eventIds = ['info-session-1'], extra = {}) => ({ attendee: person(email, extra), eventIds, requestId: randomUUID(), consent: true, marketingConsent: false, website: '' })
const db = () => context.attLoad_()
const admin = { role: 'admin' }, support = { role: 'support' }

assert(validateAttendee(person('personal@example.invalid')))
assert(validateAttendee(person('sponsor@example.invalid', { category: 'sponsor', institution: '', faculty: '', organisation: 'Test partner' })))
assert.equal(validateAttendee(person('bad', {})), null)
assert.equal(validateAttendee(person('ok@example.invalid', { faculty: '' })), null)
assert.equal(validateAttendee(person('ok@example.invalid', { category: 'sponsor', organisation: '' })), null)
assert.equal(validateAttendee(person('ok@example.invalid', { firstName: 'Header\nInjection' })), null)
assert(validateAttendee(person('team@example.invalid', { withTeam: true, teamName: '' })), 'Team name is optional')
assert(seed.every(event => validateEvent(event)))
assert.equal(validateEvent({ ...seed[0], capacity: 0 }), null)

const first = call('register', submission('student@example.invalid', ['info-session-1', 'workshop-1'], { dietary: 'Vegetarian', accessibility: 'Step-free access' }))
assert.equal(first.saved, true)
assert.equal(first.registrations.length, 2)
assert(first.registrations.every(row => row.status === 'confirmed'))
assert.equal(first.manageUrl, '/attend/manage')
assert(!JSON.stringify(first).includes('#token='))
const studentId = db().attendees.find(row => row.email === 'student@example.invalid').id
const repeat = call('register', submission('STUDENT@example.invalid', ['workshop-2'], { firstName: 'Impersonator', dietary: 'Overwrite' }))
assert.equal(repeat.verificationRequired, true)
assert.equal(repeat.registrations, undefined)
assert.equal(db().attendees.find(row => row.id === studentId).firstName, 'Test')
assert.equal(db().attendees.find(row => row.id === studentId).dietary, 'Vegetarian')
assert.equal(db().registrations.filter(row => row.attendeeId === studentId).length, 2)
assert.equal(call('register', submission('sponsor@example.invalid', ['workshop-1'], { category: 'sponsor', institution: '', faculty: '', organisation: 'Test sponsor' })).saved, true)
assert.equal(mailed.length, 0, 'Email is disabled by default')

const limited = { ...seed.find(event => event.id === 'founders-panel'), capacity: 2 }
assert.equal(call('saveEvent', { event: limited }, admin).ok, true)
const competing = await Promise.all(Array.from({ length: 12 }, (_, i) => Promise.resolve().then(() => call('register', submission(`race${i}@example.invalid`, ['founders-panel', 'workshop-3'])))))
assert(competing.every(result => result.ok))
assert.equal(db().registrations.filter(row => row.eventId === 'founders-panel' && row.status === 'confirmed').length, 2)
assert.equal(db().registrations.filter(row => row.eventId === 'founders-panel' && row.status === 'waitlisted').length, 10)
assert.equal(db().registrations.filter(row => row.eventId === 'workshop-3' && row.status === 'confirmed').length, 12)
assert(lockUses >= 15)
lockHeld = true
assert.equal(call('register', submission('busy@example.invalid')).code, 'busy')
lockHeld = false
assert(!db().attendees.some(row => row.email === 'busy@example.invalid'))
const raceFirst = db().attendees.find(row => row.email === 'race0@example.invalid')
const raceRegistration = db().registrations.find(row => row.attendeeId === raceFirst.id && row.eventId === 'founders-panel')
assert.equal(call('cancel', { registrationId: raceRegistration.id }, { attendeeId: studentId }).code, 'not_found')
assert.equal(call('cancel', { registrationId: raceRegistration.id }, { attendeeId: raceFirst.id }).ok, true)
let offered = db().registrations.find(row => row.eventId === 'founders-panel' && row.status === 'offered')
assert(offered && offered.attendeeId === db().attendees.find(row => row.email === 'race2@example.invalid').id, 'FIFO seat offer')
assert.equal(call('register', submission('last-seat@example.invalid', ['founders-panel'])).registrations[0].status, 'waitlisted')
assert.equal(call('saveEvent', { event: { ...limited, capacity: 1 } }, admin).code, 'capacity_conflict')

let model = db()
const offerToken = context.attIssueToken_(model, offered.attendeeId, 'offer', now, offered.id, Date.parse(offered.offerExpiresAt))
context.attCommit_(model)
assert(!JSON.stringify(db().tokens).includes(offerToken), 'Only token hashes are persisted')
const wrongCycleToken = context.attIssueToken_(model, offered.attendeeId, 'offer', now, offered.id, Date.parse(offered.offerExpiresAt) - 1000)
context.attCommit_(model)
assert.equal(call('acceptOffer', { token: wrongCycleToken }).code, 'conflict', 'Token must match the current offer cycle')
assert.equal(call('acceptOffer', { token: offerToken }).sessionAttendeeId, offered.attendeeId)
assert.equal(call('acceptOffer', { token: offerToken }).code, 'invalid_token')
const accepted = db().registrations.find(row => row.id === offered.id)
assert.equal(accepted.status, 'confirmed')
assert.equal(call('cancel', { registrationId: accepted.id }, { attendeeId: accepted.attendeeId }).ok, true)
offered = db().registrations.find(row => row.eventId === 'founders-panel' && row.status === 'offered')
now = Date.parse(offered.offerExpiresAt) + 1
call('events')
assert.equal(db().registrations.find(row => row.id === offered.id).status, 'waitlisted')
assert.equal(db().registrations.find(row => row.id === offered.id).offerExpired, true)
assert.equal(db().registrations.filter(row => row.eventId === 'founders-panel' && row.status === 'offered').length, 1, 'Expired offer moves to next person')

model = db()
const manageToken = context.attIssueToken_(model, studentId, 'management', now)
const expiredToken = context.attIssueToken_(model, studentId, 'management', now, '', now - 1)
context.attCommit_(model)
assert.equal(call('exchange', { token: expiredToken }).code, 'invalid_token')
assert.equal(call('exchange', { token: manageToken }).sessionAttendeeId, studentId)
assert.equal(call('exchange', { token: manageToken }).code, 'invalid_token')
assert.equal(call('updateDetails', { dietary: 'None', accessibility: '' }, { attendeeId: studentId }).attendee.dietary, 'None')
assert.equal(call('addEvents', { eventIds: ['workshop-2'] }, { attendeeId: studentId }).registrations.length, 3)
call('addEvents', { eventIds: ['workshop-2'] }, { attendeeId: studentId })
assert.equal(db().registrations.filter(row => row.attendeeId === studentId && row.eventId === 'workshop-2').length, 1)
assert.equal(call('admin', {}, admin).attendees.find(row => row.id === studentId).dietary, undefined)
assert.equal(call('admin', {}, support).attendees.find(row => row.id === studentId).dietary, 'None')
assert.equal(call('admin').code, 'unauthorized')

// Force a failure after attendee rows are written but before registrations.
const beforeFailure = db().registrations.length
failTable = 'registrations'
assert.equal(call('register', submission('recover@example.invalid', ['workshop-4', 'workshop-5'])).ok, false)
assert.equal(sheets.get('journal').rows[1][0], 'pending')
const recovered = db()
assert.equal(recovered.registrations.length, beforeFailure + 2)
assert.equal(recovered.attendees.filter(row => row.email === 'recover@example.invalid').length, 1)
assert.equal(sheets.get('journal').rows[1][0], '')
assert.equal(call('register', submission('recover@example.invalid', ['workshop-4', 'workshop-5'])).verificationRequired, true)
assert.equal(db().registrations.length, beforeFailure + 2)
const beforeBad = db().attendees.length
assert.equal(call('register', submission('invalid-events@example.invalid', ['unknown'])).code, 'event_unavailable')
assert.equal(db().attendees.length, beforeBad, 'Validation failure commits no partial attendee')

// Mail mocks never make any network call or invoke a real provider.
props.ATTENDANCE_EMAIL_MODE = 'test'; props.ATTENDANCE_TEST_EMAILS = 'mail@example.invalid'
const mailRegistration = call('register', submission('mail@example.invalid', ['info-session-1', 'workshop-1']))
assert.equal(mailRegistration.saved, true)
for (let n = 0; n < 20; n++) { model = db(); context.attDeliver_(model, now, 100) }
assert(mailed.some(mail => mail.to === 'mail@example.invalid'))
assert(mailed.every(mail => mail.to === 'mail@example.invalid'), 'Test mode prevents all unlisted recipients')
const confirmation = mailed.find(mail => mail.to === 'mail@example.invalid' && mail.subject.includes('registered'))
assert(confirmation.body.includes('Fusion Conference Room, Joyce Entrepreneurship Centre, second floor'))
assert(confirmation.body.includes('Sterling Cybersecurity and Advisory Group, 300 Ouellette Avenue, Windsor'))
assert(confirmation.body.includes('4:30') && confirmation.body.includes('10:00'))
assert(confirmation.body.includes('20261029T203000Z/20261029T213000Z'))
assert(confirmation.body.includes('20261107T150000Z/20261107T172000Z'))
assert(!JSON.stringify(db().deliveries).includes('#token='))
// Notices also have an HTML version: the logo and colours, named links rather than long addresses, and one button.
const noticeReader = db().attendees.find(row => row.email === 'mail@example.invalid').id
const noticeMail = (type, changes = {}, at = now, edit = () => {}) => {
  const copy = db(), registration = copy.registrations.find(row => row.attendeeId === noticeReader && row.eventId === 'workshop-1'), event = copy.events.find(row => row.id === 'workshop-1')
  Object.assign(registration, changes); edit(copy)
  return context.attEmail_(copy, { type, attendeeId: noticeReader, eventId: type === 'management' ? '' : event.id, registrationIds: type === 'management' ? [] : [registration.id], eventStartsAt: event.startsAt }, at)
}
const confirmationFor = change => { const copy = db(), registrationIds = change(copy); return context.attEmail_(copy, { type: 'confirmation', attendeeId: noticeReader, eventId: '', registrationIds }, now) }
const mixedNotice = confirmationFor(copy => { const [one, two] = copy.registrations.filter(row => row.attendeeId === noticeReader); two.status = 'waitlisted'; return [one.id, two.id] })
const noticeMails = { confirmation, mixedNotice, management: noticeMail('management'), reminder: noticeMail('reminder', {}, Date.parse('2026-11-07T14:00:00Z')), update: noticeMail('update'), cancellation: noticeMail('cancellation', { status: 'cancelled' }), eventCancelled: noticeMail('eventCancelled', { status: 'cancelled' }), offer: noticeMail('offer', { status: 'offered', offerExpiresAt: new Date(now + 3600000).toISOString() }), offerExpired: noticeMail('offerExpired', { status: 'waitlisted', offerExpired: true }) }
const shownWords = html => html.replace(/<head>[\s\S]*<\/head>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
for (const [type, mail] of Object.entries(noticeMails)) {
  assert(/<td align="left"[^>]*><a href="https:\/\/hultprizeuwindsor\.ca"><img src="https:\/\/hultprizeuwindsor\.ca\/images\/email\/logo\.png"/.test(mail.htmlBody), `The logo is at the top left: ${type}`)
  assert(!/https?:\/\/|#token=/.test(shownWords(mail.htmlBody)), `Readers see names, not addresses: ${type}`)
  assert.equal(mail.htmlBody.split('background:#da2381').length, 2, `One button per notice: ${type}`)
  assert(mail.htmlBody.includes(`#token=${mail.body.match(/#token=([a-f0-9]{64})/)[1]}"`), `The HTML carries the same secure link as the plain-text copy: ${type}`)
  for (const words of ['register separately', 'https://www.hultprize.org/register"', 'November 20, 2026', 'Join our Discord', 'mso-padding-alt:13px 24px']) assert(mail.htmlBody.includes(words), `${words}: ${type}`)
  assert(!/[–—]/.test(mail.subject + mail.body + mail.htmlBody), `No en or em dashes: ${type}`)
}
assert(confirmation.htmlBody.includes('20261107T150000Z/20261107T172000Z') && confirmation.htmlBody.includes('You’re confirmed.') && !confirmation.htmlBody.includes('Status:'), 'Calendar links sit behind names, and a status is a sentence rather than a label')
assert(mixedNotice.htmlBody.includes('You’re on the waitlist, without a reserved seat.') && mixedNotice.htmlBody.split('Add to Google Calendar').length === 2, 'Only the confirmed event of a mixed selection has calendar links')
for (const mail of [noticeMails.cancellation, noticeMails.eventCancelled]) assert(mail.htmlBody.includes('Your attendance is cancelled.') && !mail.htmlBody.includes('Drinks and snacks') && !mail.htmlBody.includes('Add to Google Calendar'), 'A cancelled registration has no refreshments note and no calendar links')
assert(new RegExp(`<a href="[^"]*#offer=${noticeMails.offer.body.match(/#offer=([a-f0-9]{64})/)[1]}"[^>]*>Accept my seat`).test(noticeMails.offer.htmlBody) && noticeMails.offer.htmlBody.includes('>Manage my attendance</a>') && /Accept by [^<]+\./.test(noticeMails.offer.htmlBody), 'Accepting the seat is the button, with its deadline, and managing attendance is a link')
assert(confirmation.body.includes('You’re registered! Here are the events') && mixedNotice.body.includes('Your selections are saved. Confirmed events') && noticeMails.offerExpired.body.includes('Your seat offer expired before it was accepted. You remain') && !shownWords(noticeMails.offerExpired.htmlBody).includes('expired before'), 'The plain-text copy keeps the sentence the HTML heading replaces')
const hostileNotice = noticeMail('update', {}, now, copy => { copy.attendees.find(row => row.id === noticeReader).firstName = '<img src=x onerror=alert(1)>'; copy.events.find(row => row.id === 'workshop-1').venue = '<b>Hall</b> & "Co"' })
assert(hostileNotice.htmlBody.includes('Hi &lt;img src=x') && !hostileNotice.htmlBody.includes('<img src=x') && hostileNotice.htmlBody.includes('&lt;b&gt;Hall&lt;/b&gt; &amp; &quot;Co&quot;'), 'Names and event details are escaped in the HTML')
assert(confirmationFor(copy => seed.map(event => { copy.registrations.push({ id: `all-${event.id}`, attendeeId: noticeReader, eventId: event.id, status: 'confirmed' }); return `all-${event.id}` })).htmlBody.length < 102 * 1024, 'Someone registered for every event stays under the 102 KB where Gmail clips an email')
call('requestLink', { email: 'mail@example.invalid' })
const firstManagement = mailed.filter(mail => mail.to === 'mail@example.invalid' && mail.subject.includes('secure attendance management'))
assert.equal(firstManagement.length, 1)
const usedManagementToken = firstManagement[0].body.match(/#token=([a-f0-9]{64})/)[1]
assert.equal(call('exchange', { token: usedManagementToken }).ok, true)
call('requestLink', { email: 'mail@example.invalid' })
const newManagement = mailed.filter(mail => mail.to === 'mail@example.invalid' && mail.subject.includes('secure attendance management'))
assert.equal(newManagement.length, 2, 'A fresh management email can be requested after consuming a link in the same ten-minute window')
assert.notEqual(newManagement[1].body.match(/#token=([a-f0-9]{64})/)[1], usedManagementToken)
props.ATTENDANCE_TEST_EMAILS += ',fail@example.invalid'
mailFails = true
assert.equal(call('register', submission('fail@example.invalid', ['info-session-2'])).saved, true)
let failed = db().deliveries.find(row => row.attendeeId === db().attendees.find(person => person.email === 'fail@example.invalid').id && row.type === 'confirmation')
assert.equal(failed.status, 'failed')
mailFails = false
assert.equal(call('retryEmail', { deliveryId: failed.id }, admin).ok, true)
assert.equal(db().deliveries.find(row => row.id === failed.id).status, 'sent')

// A cancelled attendee cannot receive a reminder even if the job was queued earlier.
now = Date.parse('2026-10-28T21:00:00Z')
context.attendanceMaintenance()
const infoReg = db().registrations.find(row => row.attendeeId === studentId && row.eventId === 'info-session-1')
call('cancel', { registrationId: infoReg.id }, { attendeeId: studentId })
model = db()
const reminder = model.deliveries.find(row => row.attendeeId === studentId && row.type === 'reminder')
assert(reminder)
assert.equal(context.attEmail_(model, reminder, now), null)
const beforeReminders = model.deliveries.filter(row => row.type === 'reminder').length
context.attMaintenance_(model, now)
assert.equal(model.deliveries.filter(row => row.type === 'reminder').length, beforeReminders, 'Reminder uniqueness')
const originalStart = model.events.find(event => event.id === 'info-session-1').startsAt
const currentReminder = model.deliveries.find(delivery => delivery.type === 'reminder' && delivery.attendeeId !== studentId)
assert(currentReminder)
model.events.find(event => event.id === 'info-session-1').startsAt = new Date(now + 3 * 86400000).toISOString()
assert.equal(context.attEmail_(model, currentReminder, now), null, 'A rescheduled event cannot send a stale reminder')
model.events.find(event => event.id === 'info-session-1').startsAt = originalStart
model.events.find(event => event.id === 'info-session-1').status = 'completed'
assert.equal(context.attEmail_(model, currentReminder, now), null, 'Completed events suppress queued reminders')

now = Date.parse('2026-10-29T20:35:00Z')
assert.equal(call('register', submission('too-late@example.invalid')).code, 'event_unavailable')
assert.equal(call('walkIn', submission('walk-in@example.invalid'), admin).saved, true)
const walkin = db().attendees.find(row => row.email === 'walk-in@example.invalid')
assert(db().checkins.some(row => row.attendeeId === walkin.id))
const walkinReg = db().registrations.find(row => row.attendeeId === walkin.id)
call('checkIn', { registrationId: walkinReg.id }, admin)
assert.equal(db().checkins.filter(row => row.registrationId === walkinReg.id).length, 1)
const currentConfirmed = db().registrations.filter(row => row.eventId === 'info-session-1' && row.status === 'confirmed').length
assert.equal(call('saveEvent', { event: { ...seed[0], capacity: currentConfirmed + 1 } }, admin).ok, true)
const lateWalkins = await Promise.all(Array.from({ length: 8 }, (_, i) => Promise.resolve().then(() => call('walkIn', submission(`late-walkin${i}@example.invalid`), admin))))
assert.equal(lateWalkins.filter(result => result.registrations[0].status === 'confirmed').length, 1)
assert.equal(lateWalkins.filter(result => result.registrations[0].status === 'waitlisted').length, 7)
assert.equal(db().registrations.filter(row => row.eventId === 'info-session-1' && row.status === 'confirmed').length, currentConfirmed + 1, 'At-door allocation preserves capacity after public auto-closure')
assert.equal(call('saveEvent', { event: { ...seed.find(event => event.id === 'workshop-5'), venue: 'Updated full venue' } }, admin).notificationRequired, true)
assert(call('sendUpdate', { eventId: 'workshop-5' }, admin).queued > 0)
assert.equal(call('saveEvent', { event: { ...seed.find(event => event.id === 'workshop-4'), status: 'cancelled' } }, admin).ok, true)
assert(db().registrations.filter(row => row.eventId === 'workshop-4').every(row => row.status === 'cancelled'))

// Follow-ups. Thank-you cards: queued at 7 PM Windsor time for everyone checked in, with the invite and raffle only for consent.
const beforeThanks = now
assert.equal(call('saveEvent', { event: { ...seed[0], capacity: null } }, admin).ok, true)
assert.equal(call('register', { ...submission('thanks-going@example.invalid', ['workshop-1']), marketingConsent: true }).saved, true)
assert.equal(call('walkIn', submission('thanks-going@example.invalid'), admin).saved, true)
assert.equal(call('walkIn', { ...submission('thanks-yes@example.invalid'), marketingConsent: true }, admin).saved, true)
assert(db().registrations.some(row => row.eventId === 'info-session-1' && row.status === 'confirmed' && !db().checkins.some(checkin => checkin.registrationId === row.id)), 'Fixture has confirmed attendees who never checked in')
const thanksPerson = email => db().attendees.find(row => row.email === email)
const thanksFor = email => db().deliveries.filter(row => row.type === 'thanks' && row.attendeeId === thanksPerson(email)?.id)
const info = db().events.find(event => event.id === 'info-session-1')
assert.equal(context.attFollowUpAt_('thanks', info), Date.parse('2026-10-29T23:00:00Z'), '7 PM EDT on the day of a 5:30 PM finish')
assert.equal(context.attFollowUpAt_('thanks', { endsAt: '2026-11-14T00:00:00Z' }), Date.parse('2026-11-14T01:00:00Z'), 'An hour after a 7 PM finish (Founders Panel)')
assert.equal(context.attFollowUpAt_('thanks', { endsAt: '2026-10-30T04:00:00Z' }), Date.parse('2026-10-30T05:00:00Z'), 'An event ending at midnight still gets its card an hour later')
assert.equal(context.attFollowUpAt_('missed', { endsAt: '2026-10-30T04:00:00Z' }), Date.parse('2026-10-30T14:00:00Z'), '...and its letter that same morning at 10')
assert.equal(context.attFollowUpAt_('missed', { endsAt: '2027-03-14T04:30:00Z' }), Date.parse('2027-03-14T14:00:00Z'), '10 AM EDT after an 11:30 PM finish on the night the clocks go forward')
assert.equal(context.attFollowUpAt_('thanks', { endsAt: '2026-11-01T05:30:00Z' }), Date.parse('2026-11-01T06:30:00Z'), 'A 1:30 AM finish on the night the clocks go back: an hour later')
assert.equal(context.attFollowUpAt_('missed', { endsAt: '2026-11-01T05:30:00Z' }), Date.parse('2026-11-01T15:00:00Z'), '...and 10 AM EST that morning')
assert.equal(context.attFollowUpAt_('thanks', { endsAt: '2026-11-07T17:20:00Z' }), Date.parse('2026-11-08T00:00:00Z'), '7 PM EST after a morning workshop')
assert.equal(context.attFollowUpAt_('missed', info), Date.parse('2026-10-30T14:00:00Z'), 'Missed-you letters: 10 AM EDT the next morning')
assert.equal(context.attFollowUpAt_('missed', { endsAt: '2026-10-31T23:00:00Z' }), Date.parse('2026-11-01T15:00:00Z'), '10 AM EST on the morning the clocks go back')
assert.equal(context.attFollowUpAt_('missed', { endsAt: '2026-11-14T03:50:00Z' }), Date.parse('2026-11-14T15:00:00Z'), 'A night that ends at 10:50 PM gets its letter the next morning')
now = Date.parse('2026-10-29T22:59:00Z'); context.attendanceMaintenance()
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, 0, 'No cards before 7 PM')
const mailedBeforeCards = mailed.length
now = Date.parse('2026-10-29T23:01:00Z'); context.attendanceMaintenance()
const checkedIn = db().checkins.filter(row => row.eventId === 'info-session-1')
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, checkedIn.length, 'One card per check-in, walk-ins included')
assert(db().deliveries.filter(row => row.type === 'thanks').every(row => row.status === 'held') && !mailed.slice(mailedBeforeCards).some(mail => /^Thank you for coming/.test(mail.subject)), 'Cards wait for an organiser\'s approval, so pasting the script never emails attendees by itself')
assert(db().deliveries.filter(row => row.type === 'thanks').every(row => checkedIn.some(checkin => checkin.registrationId === row.registrationIds[0])), 'Only checked-in attendees get a card')
context.attendanceMaintenance()
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, checkedIn.length, 'Thank-you uniqueness')
model = db()
const yes = context.attEmail_(model, thanksFor('thanks-yes@example.invalid')[0], now)
assert.match(yes.subject, /^Thank you for coming to Info Session #1/)
assert(yes.htmlBody.includes('https://hultprizeuwindsor.ca/images/email/thank-you-card.gif'))
assert(yes.htmlBody.includes('Workshop 1: Problem, Insight &amp; Story') && !yes.htmlBody.includes('Insight & Story'), 'Event details are HTML-escaped')
assert(/attend\/manage#token=[a-f0-9]{64}&amp;add=workshop-1/.test(yes.htmlBody), 'Unregistered attendees get a one-click sign-up for the next event')
assert(yes.body.includes('Save my spot') && yes.body.includes('The Ticket Jar opens at our next event, Workshop 1'), 'Plain-text body carries the invite and raffle')
assert(yes.htmlBody.includes('Start collecting tickets for $200') && yes.htmlBody.includes('raffle-tickets.png'))
const going = context.attEmail_(model, thanksFor('thanks-going@example.invalid')[0], now)
assert(going.body.includes('You’re already signed up') && !going.body.includes('Save my spot'), 'Registered attendees get calendar links instead of a sign-up button')
const no = context.attEmail_(model, thanksFor('walk-in@example.invalid')[0], now)
assert(no.body.includes('Thank you for coming to Info Session #1') && (no.htmlBody.split('<body')[1].match(/Thank you for coming to Info Session #1/g) || []).length === 1, 'The visible HTML names the event once, in its heading')
assert(!no.body.includes('Workshop 1') && !no.body.includes('Ticket Jar') && !no.htmlBody.includes('#token='), 'Without optional consent: the thank-you only')
const later = { ...thanksFor('thanks-yes@example.invalid')[0] }
assert.equal(context.attEmail_(model, later, Date.parse('2026-10-30T05:01:00Z')), null, 'Cards are not sent after the evening window')
assert(context.attEmail_(model, { ...later, manual: true }, Date.parse('2026-10-30T15:00:00Z')), 'A manual catch-up send still goes out the next day')
model.checkins.push({ id: 'yes-w2', registrationId: 'yes-w2-reg', attendeeId: thanksPerson('thanks-yes@example.invalid').id, eventId: 'workshop-2', checkedInAt: '2026-11-14T15:30:00Z' })
const afterRaffle = context.attFollowUp_(model, model.events.find(event => event.id === 'workshop-2'), thanksPerson('thanks-yes@example.invalid'), Date.parse('2026-11-14T23:00:00Z'), true, 'thanks')
assert(afterRaffle.body.includes('Keep filling the Ticket Jar') && afterRaffle.body.includes('Info Session #2'), 'Once the jar is open, later cards say keep collecting and name the next event')
const finale = context.attFollowUp_(model, model.events.find(event => event.id === 'campus-grand-finale'), thanksPerson('thanks-yes@example.invalid'), Date.parse('2027-02-05T00:00:00Z'), true, 'thanks')
assert(!finale.body.includes('Ticket Jar') && !finale.body.includes('next event'), 'After the finale there is no draw or next event to mention')
// Missed-you letters: 10 AM the next morning, for confirmed registrations nobody checked in.
const noShows = () => db().registrations.filter(row => row.eventId === 'info-session-1' && row.status === 'confirmed' && !db().checkins.some(checkin => checkin.registrationId === row.id))
const missedLetters = () => db().deliveries.filter(row => row.type === 'missed')
now = Date.parse('2026-10-30T13:59:00Z'); context.attendanceMaintenance()
assert.equal(missedLetters().length, 0, 'No letters before 10 AM')
now = Date.parse('2026-10-30T14:01:00Z'); context.attendanceMaintenance()
assert.equal(missedLetters().length, noShows().length, 'One letter per confirmed registration with no check-in')
assert(missedLetters().every(row => noShows().some(registration => registration.id === row.registrationIds[0])), 'Attendees, waitlisted and cancelled registrations get no letter')
assert(db().registrations.some(row => row.eventId === 'info-session-1' && row.status === 'waitlisted'), 'Fixture includes waitlisted registrations')
context.attendanceMaintenance()
assert.equal(missedLetters().length, noShows().length, 'Missed-you uniqueness')
model = db()
const letter = missedLetters()[0], missedPerson = model.attendees.find(row => row.id === letter.attendeeId)
const missedYes = context.attFollowUp_(model, info, missedPerson, now, true, 'missed'), missedNo = context.attEmail_(model, letter, now)
assert.match(missedYes.subject, /^We missed you at Info Session #1/)
assert(missedYes.htmlBody.includes('https://hultprizeuwindsor.ca/images/email/missed-you-letter.gif') && !missedYes.htmlBody.includes('thank-you-card.gif'))
assert(missedYes.body.includes('couldn’t make it to Info Session #1') && missedYes.body.includes('we missed you at the door'), 'Kind note, and a way to correct a missed check-in')
assert(missedYes.body.includes('Come to the next one? We’d love to see you there: Workshop 1') && missedYes.body.includes('The Ticket Jar opens at our next event'), 'With consent: the invite and the raffle')
assert(!missedNo.body.includes('Workshop 1') && !missedNo.body.includes('Ticket Jar') && !missedNo.htmlBody.includes('#token='), 'Without consent: the note only')
model.checkins.push({ id: 'late-door-fix', registrationId: letter.registrationIds[0], attendeeId: letter.attendeeId, eventId: 'info-session-1', checkedInAt: new Date(now).toISOString() })
assert.equal(context.attEmail_(model, letter, now), null, 'A check-in recorded after queueing cancels the letter')
assert.equal(context.attEmail_(db(), letter, Date.parse('2026-10-30T20:01:00Z')), null, 'Letters are not sent after the morning window')
assert(context.attEmail_(db(), { ...letter, manual: true }, Date.parse('2026-10-31T12:00:00Z')), 'A manual catch-up still sends later')
// One letter per run of missed events: none for the next miss, then one again after they come back.
model = db()
const away = letter.attendeeId, eventAt = id => model.events.find(event => event.id === id)
model.registrations.push({ id: 'away-w1', attendeeId: away, eventId: 'workshop-1', status: 'confirmed', createdAt: '2026-10-20T00:00:00Z' }, { id: 'away-w2', attendeeId: away, eventId: 'workshop-2', status: 'confirmed', createdAt: '2026-10-20T00:00:00Z' }, { id: 'wait-w1', attendeeId: thanksPerson('thanks-yes@example.invalid').id, eventId: 'workshop-1', status: 'waitlisted', createdAt: '2026-10-20T00:00:00Z' })
context.attQueueFollowUps_(model, eventAt('workshop-1'), 'missed', Date.parse('2026-11-08T15:01:00Z'), false)
assert(!model.deliveries.some(row => row.key === 'missed:away-w1'), 'A second miss in a row gets no letter')
assert(!model.deliveries.some(row => row.key === 'missed:wait-w1'), 'A waitlisted registration gets no letter')
model.checkins.push({ id: 'came-back', registrationId: 'came-back-reg', attendeeId: away, eventId: 'founders-panel', checkedInAt: '2026-11-13T22:00:00Z' })
context.attQueueFollowUps_(model, eventAt('workshop-2'), 'missed', Date.parse('2026-11-15T15:01:00Z'), false)
assert(model.deliveries.some(row => row.key === 'missed:away-w2'), 'After coming back, the next miss gets a letter again')
const nextMiss = changes => { const copy = db(); copy.registrations.push({ id: 'away-w1', attendeeId: away, eventId: 'workshop-1', status: 'confirmed', createdAt: '2026-10-20T00:00:00Z' }); changes(copy); context.attQueueFollowUps_(copy, eventAt('workshop-1'), 'missed', Date.parse('2026-11-08T15:01:00Z'), false); return copy.deliveries.some(row => row.key === 'missed:away-w1') }
assert.equal(nextMiss(() => {}), false, 'Control: a second miss in a row gets no letter')
assert.equal(nextMiss(copy => copy.checkins.push({ id: 'door-fix', registrationId: letter.registrationIds[0], attendeeId: away, eventId: 'info-session-1', checkedInAt: '2026-10-30T16:00:00Z' })), true, 'A check-in fixed after the letter means they came, so the next miss gets a letter')
assert.equal(nextMiss(copy => Object.assign(copy.deliveries.find(row => row.id === letter.id), { status: 'failed', attempts: 5 })), true, 'A letter that never got through does not hold back the next one')
// Events ending the same day are queued in start order, wherever they sit in the table, so a run still gets one letter.
model = db()
const early = { ...eventAt('workshop-2'), id: 'early-session', startsAt: '2026-11-14T12:00:00Z', endsAt: '2026-11-14T14:00:00Z' }
model.events.push(early)
const twice = thanksPerson('thanks-yes@example.invalid').id
model.registrations.push({ id: 'twice-early', attendeeId: twice, eventId: 'early-session', status: 'confirmed', createdAt: '2026-10-20T00:00:00Z' }, { id: 'twice-w2', attendeeId: twice, eventId: 'workshop-2', status: 'confirmed', createdAt: '2026-10-20T00:00:00Z' })
assert(model.events.findIndex(event => event.id === 'workshop-2') < model.events.findIndex(event => event.id === 'early-session'), 'Fixture: the later event comes first in the table')
context.attMaintenance_(model, Date.parse('2026-11-15T15:01:00Z'))
assert.deepEqual(model.deliveries.filter(row => row.type === 'missed' && row.attendeeId === twice).map(row => row.eventId), ['early-session'], 'One letter for two misses on the same day: the earlier event')
// Cancelled events send nothing; maintenance stops queueing when the window closes.
model = db()
model.registrations.push({ id: 'gone-reg', attendeeId: twice, eventId: 'workshop-4', status: 'confirmed', createdAt: '2026-10-20T00:00:00Z' })
model.checkins.push({ id: 'gone-in', registrationId: 'gone-reg', attendeeId: twice, eventId: 'workshop-4', checkedInAt: '2026-12-05T15:30:00Z' })
context.attMaintenance_(model, Date.parse('2026-12-06T01:00:00Z')); context.attMaintenance_(model, Date.parse('2026-12-06T15:01:00Z'))
assert(!model.deliveries.some(row => row.eventId === 'workshop-4' && ['thanks', 'missed'].includes(row.type)), 'A cancelled event gets no follow-ups')
model = db()
model.checkins.push({ id: 'late-in', registrationId: 'late-reg', attendeeId: twice, eventId: 'info-session-1', checkedInAt: '2026-10-30T04:00:00Z' })
context.attMaintenance_(model, Date.parse('2026-10-30T05:01:00Z'))
assert(!model.deliveries.some(row => row.key === 'thanks:late-reg'), 'No cards are queued once the six-hour window has closed')
// The next event: each registration state gets its own line, and closed events aren't offered.
const yesPerson = thanksPerson('thanks-yes@example.invalid'), stateLine = registration => { const copy = db(); copy.registrations.push({ id: 'state', attendeeId: yesPerson.id, eventId: 'workshop-1', createdAt: '2026-10-20T00:00:00Z', ...registration }); return context.attFollowUp_(copy, info, yesPerson, now, true, 'thanks').body }
assert(stateLine({ status: 'offered', offerExpiresAt: '2026-10-31T14:00:00Z' }).includes('We’re holding a seat for you until'), 'A live seat offer is named as one')
assert(stateLine({ status: 'waitlisted', offerExpired: true }).includes('Your seat offer for this one has expired'), 'An expired offer is named as one')
assert(stateLine({ status: 'waitlisted' }).includes('You’re on the waitlist for this one'))
model = db(); model.events.find(event => event.id === 'workshop-1').status = 'closed'
const closedNext = context.attFollowUp_(model, info, yesPerson, now, true, 'thanks')
assert(closedNext.body.includes('our next event: Founders Panel') && !closedNext.htmlBody.includes('add=workshop-1'), 'An event closed to registration is skipped for the next open one')
// Ticket Jar wording follows whether the reader already has tickets.
const noTickets = context.attFollowUp_(db(), eventAt('workshop-1'), missedPerson, Date.parse('2026-11-08T15:05:00Z'), true, 'missed')
assert(noTickets.body.includes('Start collecting tickets for $200') && noTickets.body.includes('gets you a free raffle ticket') && !noTickets.body.includes('Your tickets'), 'Someone with no tickets is not told to keep filling the jar')
assert(yes.htmlBody.includes('<!--[if mso]><table role="presentation" width="560"'), 'Classic Outlook gets a fixed-width table')
for (const mail of [yes, going, no, missedYes, missedNo, noTickets, closedNext]) for (const [, file] of mail.htmlBody.matchAll(/\/images\/email\/([\w.-]+)/g)) assert(existsSync(new URL(`../public/images/email/${file}`, import.meta.url)), `Every picture an email loads is in the site: ${file}`)
assert(yes.body.includes('please don’t forward this email') && !yes.body.includes('signs you in for 48 hours'), 'The sign-up link is described as personal and single-use')
// Hyphens, never en or em dashes, in anything people read.
for (const mail of [yes, going, no, missedYes, missedNo, noTickets, closedNext]) assert(!/[–—]/.test(mail.subject + mail.body + mail.htmlBody), `No en or em dashes: ${mail.subject}`)
assert(/(?:[ap]\.m\.|[AP]M)-\d{1,2}:\d{2}/.test(yes.body), 'The next event’s time range uses a hyphen')
assert(/ · <span style="display:inline-block;">[^<]*(?:[ap]\.m\.|[AP]M)-\d[^<]*<\/span><\/strong><br>/.test(yes.htmlBody), 'The time range is held together, so a phone never splits it at the hyphen, even in the Gmail app with a non-Google account')
assert(yes.htmlBody.includes('alt="Raffle tickets for the Ticket Jar: $200, drawn February 4, 2027" style="display:block;width:100%;max-width:250px;'), 'The raffle tickets shrink with their box, so a picture that fails to load can’t widen the email on a small phone')
assert(yes.body.includes('The more events you come to, the better your chance at winning the $200. May the odds be EVER in your favour.'), 'The raffle line ends with the new wish')
for (const mail of [yes, missedNo]) assert(/<td align="left"[^>]*><a href="https:\/\/hultprizeuwindsor\.ca"><img src="https:\/\/hultprizeuwindsor\.ca\/images\/email\/logo\.png"/.test(mail.htmlBody) && mail.htmlBody.indexOf('logo.png') < mail.htmlBody.indexOf('.gif'), 'The chapter logo sits at the top left, above the picture')
assert(/you can still sign up at <a href="https:\/\/hultprizeuwindsor\.ca\/attend\/manage"[^>]*>hultprizeuwindsor\.ca<\/a>\./.test(yes.htmlBody), 'The fallback link reads as the short site address, which never widens the email on a small phone')
assert(yes.htmlBody.includes(`thank-you-card.gif?v=${context.ATT_ART_VERSION}"`) && missedYes.htmlBody.includes(`missed-you-letter.gif?v=${context.ATT_ART_VERSION}"`), 'The GIF addresses carry the art version, so mail apps fetch a changed picture')
// The invite to Workshop 1 says who leads it, beside their Polaroid, after the event's description and before the sign-up.
for (const mail of [yes, going, missedYes]) assert(mail.htmlBody.includes('<img src="https://hultprizeuwindsor.ca/images/email/peaches-madarang-cesario.png" width="140" alt=""') && mail.htmlBody.includes('Led by <strong style="color:#002b51;">Peaches <span style="display:inline-block;">Madarang-Cesario,</span></strong> Chief Operating Officer at Sterling.') && mail.body.includes('in partnership with Sterling Cybersecurity and Advisory Group.\nLed by Peaches Madarang-Cesario, Chief Operating Officer at Sterling.'), `The invite to Workshop 1 names Peaches Madarang-Cesario as its lead, with the Polaroid: ${mail.subject}`)
assert(yes.htmlBody.indexOf('Explore the problem') < yes.htmlBody.indexOf('peaches-madarang-cesario.png') && yes.htmlBody.indexOf('Led by') < yes.htmlBody.indexOf('Save my spot'), 'The lead comes after the description and before the sign-up button')
assert(/<div style="margin:0 0 14px;font-size:0;"><div style="display:inline-block;width:100%;max-width:156px;[^"]*"><img[^>]*peaches[^>]*style="display:block;width:100%;max-width:140px;[^>]*><\/div><div style="display:inline-block;width:100%;max-width:300px;[^"]*" class="lead-words">/.test(yes.htmlBody), 'The Polaroid and its words are inline-block columns, which sit side by side where there is room and stack on a phone and in Outlook, with no Outlook table whose narrow cell would break the hyphenated name')
assert(!closedNext.body.includes('Led by') && !closedNext.htmlBody.includes('images/email/peaches'), 'An event with no named lead says nothing about one')
assert(!no.body.includes('Led by') && !missedNo.htmlBody.includes('peaches'), 'Without consent there is no invite, so no lead')
// Peaches leads every workshop. Neil Cesario joins Peaches to open Workshop 2, so its invite (in the Founders Panel's
// follow-ups) shows both Polaroids in one wider picture, with the words in a narrower column beside it.
assert(seed.filter(event => event.group === 'workshops').every(event => context.ATT_EVENT_LEADS.some(lead => lead.eventId === event.id && lead.lead === context.ATT_PEACHES)), 'Peaches leads every workshop')
const toWorkshop2 = context.attFollowUp_(db(), db().events.find(event => event.id === 'founders-panel'), yesPerson, Date.parse('2026-11-14T01:00:00Z'), true, 'thanks')
assert(toWorkshop2.body.includes('our next event: Workshop 2: Solution, Business Model & Impact') && toWorkshop2.body.includes('in partnership with Sterling Cybersecurity and Advisory Group.\nLed by Peaches Madarang-Cesario, Chief Operating Officer at Sterling. Neil Cesario, Director and Chief Information Security Officer at Sterling, joins Peaches to open it.\n'), 'The invite to Workshop 2 says Peaches leads it and Neil Cesario joins Peaches to open it')
assert(toWorkshop2.htmlBody.includes('Led by <strong style="color:#002b51;">Peaches <span style="display:inline-block;">Madarang-Cesario,</span></strong> Chief Operating Officer at Sterling. <strong style="color:#002b51;">Neil Cesario,</strong> Director and Chief Information Security Officer at Sterling, joins Peaches to open it.</p>'), 'The email bolds both names')
assert(/<div style="margin:0 0 14px;font-size:0;"><div style="display:inline-block;width:100%;max-width:252px;[^"]*"><img src="https:\/\/hultprizeuwindsor\.ca\/images\/email\/peaches-and-neil-cesario\.png" width="236" alt="" style="display:block;width:100%;max-width:236px;[^>]*><\/div><div style="display:inline-block;width:100%;max-width:204px;[^"]*" class="lead-words">/.test(toWorkshop2.htmlBody) && !toWorkshop2.htmlBody.includes('images/email/peaches-madarang-cesario.png'), 'Workshop 2 shows the picture of both Polaroids, its columns sized to fit')
// Stacked on a phone, the words under the picture use the whole box, in the mail apps that read the head's style.
const phoneStyle = '</title><style>@media only screen and (max-width:571px) { .lead-words { max-width:none !important; } }</style></head>'
for (const mail of [yes, toWorkshop2]) assert(mail.htmlBody.includes(phoneStyle) && mail.htmlBody.split('class="lead-words"').length === 2, `A lead's words widen to the whole box on a phone: ${mail.subject}`)
assert(!no.htmlBody.includes('<style') && !closedNext.htmlBody.includes('<style'), 'An email with no lead has no style block')
assert(context.ATT_EVENT_LEADS.filter(lead => lead.eventId !== 'workshop-2').every(lead => !lead.opener && lead.picture === 'peaches-madarang-cesario.png' && lead.width === 140), 'Every workshop but Workshop 2 names Peaches alone, with the single Peaches Polaroid')
const toWorkshop3 = context.attFollowUp_(db(), db().events.find(event => event.id === 'team-mixer'), yesPerson, Date.parse('2026-11-18T01:00:00Z'), true, 'thanks')
assert(toWorkshop3.body.includes('our next event: Workshop 3') && toWorkshop3.body.includes('\nLed by Peaches Madarang-Cesario, Chief Operating Officer at Sterling.\n') && toWorkshop3.htmlBody.includes('peaches-madarang-cesario.png" width="140"') && !toWorkshop3.body.includes('Neil'), 'Later workshops name Peaches alone')
for (const mail of [toWorkshop2, toWorkshop3]) assert(!/[–—]/.test(mail.subject + mail.body + mail.htmlBody), `No en or em dashes: ${mail.subject}`)
// Each picture is drawn at twice the width the email shows it, so it stays sharp on phones.
for (const lead of context.ATT_EVENT_LEADS) {
  const picture = new URL(`../public/images/email/${lead.picture}`, import.meta.url)
  assert(seed.some(event => event.id === lead.eventId) && existsSync(picture), `ATT_EVENT_LEADS names a real event and its picture is in public/images/email: ${lead.eventId}`)
  assert.equal(readFileSync(picture).readUInt32BE(16), 2 * lead.width, `${lead.picture} is drawn at twice the width ATT_EVENT_LEADS shows it at`)
}
// Names and titles are typed into Attendance.gs by hand, so check them against their partner page.
const partners = readFileSync(new URL('../src/data/communityPartners.ts', import.meta.url), 'utf8')
for (const person of context.ATT_EVENT_LEADS.flatMap(lead => [lead.lead, lead.opener]).filter(Boolean)) assert(partners.includes(`name: '${person.name}', title: '${person.title.split(' at ')[0]}'`), `${person.name}'s name and title match their partner page in src/data/communityPartners.ts`)
// The GIF addresses change whenever the GIFs do, so no mail app can keep showing an old one it cached.
const art = createHash('sha256')
for (const file of ['thank-you-card.gif', 'missed-you-letter.gif']) art.update(readFileSync(new URL(`../public/images/email/${file}`, import.meta.url)))
assert.equal(context.ATT_ART_VERSION, art.digest('hex').slice(0, 8), 'ATT_ART_VERSION in Attendance.gs is the fingerprint scripts/generate-email-art.mjs printed for the current GIFs')
// Mail apps never restart a GIF that has stopped, so each follow-up picture loops forever (NETSCAPE2.0 loop count 0).
for (const file of ['thank-you-card.gif', 'missed-you-letter.gif']) { const gif = readFileSync(new URL(`../public/images/email/${file}`, import.meta.url)), at = gif.indexOf('NETSCAPE2.0'); assert(at > 0 && gif.readUInt16LE(at + 13) === 0, `${file} loops forever`) }
// The picture's place is never empty: a black box that needs no download, then the GIF's first frame, a small file of the
// very same pixels, then the GIF. The GIF's height holds its place so the words don't jump when it lands.
for (const [file, mail] of [['thank-you-card', yes], ['missed-you-letter', missedYes]]) {
  // The black box sits exactly where the scene draws the envelope.
  const scene = readFileSync(new URL(`../scripts/email-art/${file}.html`, import.meta.url), 'utf8'), [, left, top, envelopeWidth, envelopeHeight] = scene.match(/\.env \{ position: absolute; left: (\d+)px; top: (\d+)px; width: (\d+)px; height: (\d+)px;/).map(Number), [, sceneWidth, sceneHeight] = scene.match(/html, body \{ margin: 0; width: (\d+)px; height: (\d+)px;/).map(Number)
  const percent = value => String(Number((value * 100).toFixed(2)))
  assert(mail.htmlBody.includes(`background-image:linear-gradient(#2c2a2d,#2c2a2d);background-position:${percent(left / (sceneWidth - envelopeWidth))}% ${percent(top / (sceneHeight - envelopeHeight))}%;background-size:${percent(envelopeWidth / sceneWidth)}% ${percent(envelopeHeight / sceneHeight)}%;`), `${file} draws its black box exactly where the envelope sits`)
  const gif = readFileSync(new URL(`../public/images/email/${file}.gif`, import.meta.url)), still = readFileSync(new URL(`../public/images/email/${file}-first-frame.gif`, import.meta.url))
  assert(mail.htmlBody.includes(`background-image:url(https://hultprizeuwindsor.ca/images/email/${file}-first-frame.gif?v=${context.ATT_ART_VERSION});`), `${file} shows its first frame while the GIF loads`)
  assert(mail.htmlBody.includes(`${file}.gif?v=${context.ATT_ART_VERSION}" width="560" height="${560 * gif.readUInt16LE(8) / gif.readUInt16LE(6)}"`), `${file} holds its place at the GIF's own proportions`)
  assert(still.length < 80 * 1024 && still.readUInt16LE(6) === gif.readUInt16LE(6) && still.readUInt16LE(8) === gif.readUInt16LE(8) && gif.includes(still.subarray(13 + 768, still.length - 1)), `${file}-first-frame.gif is a small copy of the GIF's own first frame`)
}
assert(yes.htmlBody.includes('logo.png" width="240" height="43"'), 'The logo holds its place too')
// Mail apps' image servers and browsers keep the pictures rather than checking back on every open. GIF addresses change
// with the art (ATT_ART_VERSION), so they can be kept for a year; the PNGs keep one address, so only for a week.
const pictureCache = source => JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).headers.find(rule => rule.source === source)?.headers.find(header => header.key === 'Cache-Control')?.value
assert.equal(pictureCache('/images/email/(.*).gif'), 'public, max-age=31536000, immutable')
assert.equal(pictureCache('/images/email/(.*).png'), 'public, max-age=604800')
// Nobody should wait for the picture: each scene starts moving almost at once and is open within 2.75 seconds.
for (const file of ['thank-you-card', 'missed-you-letter']) { const scene = readFileSync(new URL(`../scripts/email-art/${file}.html`, import.meta.url), 'utf8'); assert(Number(scene.match(/flap \d+ms cubic-bezier\([^)]*\) (\d+)ms/)[1]) <= 200 && Number(scene.match(/<meta name="length" content="(\d+)">/)[1]) <= 2750, `${file} opens without a long wait`) }
// Retrying a follow-up from the dashboard ignores the time window; transactional email is sent ahead of follow-ups.
const blocked = thanksFor('thanks-yes@example.invalid')[0]
assert.equal(call('retryEmail', { deliveryId: blocked.id }, admin).ok, true)
assert.equal(db().deliveries.find(row => row.id === blocked.id).manual, true, 'A dashboard retry marks the follow-up manual')
model = db()
const sinkSheet = { getLastRow: () => 0, getMaxRows: () => 100000, insertRowsAfter() {}, setFrozenRows() {}, getRange: () => ({ getValues: () => [[]], setValues() {}, clearContent() {} }) }
model._ss = { getSheetByName: () => sinkSheet }
const tester = model.attendees.find(row => row.email === 'mail@example.invalid')
model.deliveries = [1, 2, 3].map(i => ({ id: `wave-${i}`, key: `wave-${i}`, type: 'thanks', attendeeId: tester.id, eventId: 'info-session-1', registrationIds: [`wave-reg-${i}`], status: 'pending', attempts: 0, nextAttemptAt: 0, manual: true }))
  .concat([{ id: 'sign-in', key: 'sign-in', type: 'management', attendeeId: tester.id, eventId: '', registrationIds: [], status: 'pending', attempts: 0, nextAttemptAt: 0 }])
context.attDeliver_(model, now, 1)
assert.deepEqual(model.deliveries.filter(row => row.attempts).map(row => row.id), ['sign-in'], 'A sign-in link goes out ahead of a wave of follow-ups')

// Editor helpers: a preview of all four follow-ups for the tester only, and a manual catch-up.
const quiet = run => { const log = console.log; console.log = () => {}; try { run() } finally { console.log = log } }
const beforePreview = mailed.length
quiet(() => context.sendFollowUpTest())
const previews = mailed.slice(beforePreview)
assert.deepEqual(previews.map(mail => mail.to), Array(4).fill('mail@example.invalid'), 'Previews go only to the first test address')
assert.deepEqual(previews.map(mail => mail.subject.replace(/ 💌$/, '')), ['[Test] Thank you for coming to Info Session #1', '[Test, no updates consent] Thank you for coming to Info Session #1', '[Test] We missed you at Info Session #1', '[Test, no updates consent] We missed you at Info Session #1'])
assert(previews[0].htmlBody.includes('Ticket Jar') && !previews[1].htmlBody.includes('Ticket Jar') && previews[2].htmlBody.includes('Ticket Jar') && !previews[3].htmlBody.includes('Ticket Jar'))
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, checkedIn.length, 'Previews queue nothing')
// Every event still to come: its reminder, card and letter as they'll look on the day, to the tester only, saving nothing.
const sheetRows = () => JSON.stringify([...sheets].map(([name, sheet]) => [name, sheet.rows]))
const stillToCome = context.attEvents_(db(), now).filter(event => !['cancelled', 'completed'].includes(event.status) && Date.parse(event.startsAt) > now)
assert(stillToCome.length >= 5 && stillToCome.at(-1).id === 'campus-grand-finale', 'Fixture: several events are still to come, up to the finale')
const beforeEvery = mailed.length, rowsBeforeEvery = sheetRows(), sendForReal = context.MailApp.sendEmail
context.MailApp.sendEmail = mail => { assert.equal(lockHeld, false, 'The lock is not held while sending, so attendees are not turned away as busy'); sendForReal(mail) }
quiet(() => context.sendEveryEventTest())
context.MailApp.sendEmail = sendForReal
const everyEvent = mailed.slice(beforeEvery)
assert.equal(sheetRows(), rowsBeforeEvery, 'The every-event test saves nothing: no tokens, deliveries or test reader')
assert.deepEqual([...new Set(everyEvent.map(mail => mail.to))], ['mail@example.invalid'], 'It goes only to the first test address')
assert(everyEvent.every(mail => !mail.cc && !mail.bcc), 'Nobody else is copied')
assert.equal(everyEvent.length, stillToCome.length * 3, 'Three emails for each event still to come')
stillToCome.forEach((event, index) => {
  const [reminderTest, cardTest, letterTest] = everyEvent.slice(index * 3, index * 3 + 3), total = everyEvent.length
  // Each email invites to whatever hasn't started by the moment it really goes out.
  const nextAfter = type => stillToCome.find(item => item.id !== event.id && Date.parse(item.startsAt) > context.attFollowUpAt_(type, event))
  const cardNext = nextAfter('thanks'), letterNext = nextAfter('missed')
  assert(reminderTest.subject === `[Test ${index * 3 + 1}/${total}] Reminder: ${event.title}` && reminderTest.htmlBody.includes('See you soon!') && reminderTest.htmlBody.includes(event.title.replace(/&/g, '&amp;')), `The reminder for ${event.id}`)
  assert(cardTest.subject.startsWith(`[Test ${index * 3 + 2}/${total}] Thank you for coming to ${event.title}`) && letterTest.subject.startsWith(`[Test ${index * 3 + 3}/${total}] We missed you at ${event.title}`), `The card and letter for ${event.id}, in order`)
  if (cardNext) {
    assert(cardTest.body.includes(`our next event: ${cardNext.title}`) && letterTest.body.includes(`We’d love to see you there: ${letterNext.title}`), `${event.id} invites to what comes next when each email goes out`)
    assert(cardTest.body.includes('Keep filling the Ticket Jar') && letterTest.body.includes('Start collecting tickets'), `Someone who came to ${event.id} has tickets, and someone who missed it doesn't`)
    assert(cardTest.htmlBody.includes(`/attend?events=${cardNext.id}`) && !cardTest.htmlBody.includes('#token='), 'The sign-up button opens the public form, as no real reader is behind it')
  } else assert(!/next event|Ticket Jar/.test(cardTest.body + letterTest.body), 'The finale invites to nothing and has no raffle section')
})
// The Founders Panel's card goes the evening before Workshop 2, so it invites to it. Its letter goes at 10 AM as Workshop 2
// starts, too late to invite to it, so it invites to the event after.
const foundersMails = everyEvent.filter(mail => /(Thank you for coming to|We missed you at) Founders Panel/.test(mail.subject))
assert(foundersMails[0].body.includes('our next event: Workshop 2') && foundersMails[1].body.includes('see you there: Info Session #2'), 'The Founders Panel card invites to Workshop 2, and its letter to Info Session #2')
for (const mail of everyEvent) {
  assert(!/[–—]/.test(mail.subject + mail.body + mail.htmlBody), `No en or em dashes: ${mail.subject}`)
  for (const [, file] of mail.htmlBody.matchAll(/\/images\/email\/([\w.-]+)/g)) assert(existsSync(new URL(`../public/images/email/${file}`, import.meta.url)), `The picture is in the site: ${file}`)
}
// The Founders Panel's speakers show in everything about it: the invite to it, its notices and its own card and letter.
const panel = context.ATT_EVENT_PANELS.find(item => item.eventId === 'founders-panel')
assert.equal(panel.speakers.map(speaker => speaker.name).join(', '), 'Tal Czudner, Eunice Ajayi, Gregory Odiase, Umar Azhar, Ameen Fadel, Jordan Goure, Uzair Syed, Peaches Madarang-Cesario', 'All eight speakers, in speaking order')
const escaped = text => text.replace(/&/g, '&amp;')
const showsPanel = mail => mail.htmlBody.split('images/email/panel-').length === 9 && panel.speakers.every(speaker => mail.htmlBody.includes(`<img src="https://hultprizeuwindsor.ca/images/email/${speaker.picture}" width="112" height="163" alt=""`) && mail.htmlBody.includes(`>${speaker.name}</strong>`) && mail.htmlBody.includes(`>${escaped(speaker.role)}</p>`) && mail.body.includes(`${speaker.name}, ${speaker.role}`))
const noPanel = mail => !mail.htmlBody.includes('images/email/panel-') && !mail.body.includes('Tal Czudner')
const panelNotice = (type, changes = {}, at = now) => {
  const copy = db(), event = copy.events.find(row => row.id === 'founders-panel')
  copy.registrations.push({ id: 'panel-notice', attendeeId: noticeReader, eventId: event.id, status: 'confirmed', ...changes })
  return context.attEmail_(copy, { type, attendeeId: noticeReader, eventId: type === 'confirmation' ? '' : event.id, registrationIds: ['panel-notice'], eventStartsAt: event.startsAt }, at)
}
const panelReminder = panelNotice('reminder', {}, Date.parse('2026-11-12T23:00:00Z')), panelOffer = panelNotice('offer', { status: 'offered', offerExpiresAt: '2026-11-12T00:00:00Z' })
for (const mail of [panelReminder, panelOffer, panelNotice('confirmation'), panelNotice('update')]) assert(showsPanel(mail) && mail.body.includes('Meet the Founders Panel:\nTal Czudner, CEO, Windsor-Detroit Tunnel\nEunice Ajayi, Founder, FieldNote AI'), `A notice about the panel shows its speakers: ${mail.subject}`)
assert(panelReminder.htmlBody.indexOf('Manage my attendance') < panelReminder.htmlBody.indexOf('panel-tal-czudner') && panelReminder.htmlBody.indexOf('panel-peaches') < panelReminder.htmlBody.indexOf('Bring your team'), 'A notice keeps its button above the speakers')
assert(panelOffer.htmlBody.indexOf('Accept my seat') < panelOffer.htmlBody.indexOf('panel-tal-czudner'), 'The speakers never push accepting a seat out of sight')
for (const mail of [panelNotice('cancellation', { status: 'cancelled' }), panelNotice('eventCancelled', { status: 'cancelled' })]) assert(noPanel(mail), 'A cancelled registration is not shown who it will miss')
for (const [type, mail] of Object.entries(noticeMails)) assert(noPanel(mail), `A notice about another event has no speakers: ${type}`)
assert(showsPanel(closedNext) && closedNext.body.includes('Meet the Founders Panel:\nTal Czudner') && closedNext.htmlBody.indexOf('Hear from founders') < closedNext.htmlBody.indexOf('panel-tal-czudner') && closedNext.htmlBody.indexOf('panel-peaches') < closedNext.htmlBody.indexOf('background:#da2381'), 'The invite to the panel shows its speakers after the description and before the sign-up')
const isAboutPanel = mail => /(Thank you for coming to|We missed you at) (Workshop 1|Founders Panel)|Reminder: Founders Panel/.test(mail.subject)
assert.equal(everyEvent.filter(isAboutPanel).length, 5, 'Fixture: the panel is what Workshop 1\'s card and letter invite to, and has a reminder, card and letter of its own')
for (const mail of everyEvent) assert(isAboutPanel(mail) ? showsPanel(mail) : noPanel(mail), `Only the emails about the panel show its speakers: ${mail.subject}`)
assert(foundersMails[0].htmlBody.includes('Thank you to our panel') && foundersMails[0].body.includes('Thank you to our panel:\nTal Czudner') && foundersMails[1].htmlBody.includes('Here’s who you missed') && foundersMails[1].body.includes('Here’s who you missed:\nTal Czudner'), 'The panel\'s own card thanks them, and its letter says who was missed')
const panelEvent = db().events.find(event => event.id === 'founders-panel'), noUpdates = type => context.attFollowUp_(db(), panelEvent, yesPerson, context.attFollowUpAt_(type, panelEvent), false, type)
for (const mail of [noUpdates('thanks'), noUpdates('missed')]) assert(showsPanel(mail) && !mail.body.includes('next event') && !mail.body.includes('see you there'), 'The panel\'s own card and letter show its speakers without the updates consent, with no invite')
assert(noPanel(context.attFollowUp_(db(), db().events.find(event => event.id === 'workshop-1'), yesPerson, Date.parse('2026-11-08T00:05:00Z'), false, 'thanks')), 'Without the updates consent there is no invite to the panel, so no speakers')
// Every designed email ends with every supporter's logo, above the small print. They're pictures, not links.
const designed = [...Object.values(noticeMails), panelReminder, yes, no, missedYes, missedNo, ...everyEvent]
for (const mail of designed) {
  for (const supporter of context.ATT_SUPPORTERS) assert.equal(mail.htmlBody.split(`<img src="https://hultprizeuwindsor.ca/images/email/${supporter.picture}" width="125" height="60" alt="${supporter.name}"`).length, 2, `${supporter.name}'s logo is in: ${mail.subject}`)
  assert(mail.htmlBody.indexOf('Supported by') > mail.htmlBody.indexOf('</h1>') && mail.htmlBody.indexOf('supporter-city-of-windsor') < mail.htmlBody.lastIndexOf('One idea. Four minutes.'), `The logos sit under the email and above the small print: ${mail.subject}`)
  assert(!/<a [^>]*>\s*<img[^>]*supporter-/.test(mail.htmlBody), `The logos aren't links, as each outside address can count against an email with spam filters: ${mail.subject}`)
  assert(mail.body.includes(`Supported by ${context.ATT_SUPPORTERS.map(supporter => supporter.name).join(', ')}.`), `The plain-text copy names them: ${mail.subject}`)
  assert(!/[–—]/.test(mail.subject + mail.body + mail.htmlBody), `No en or em dashes: ${mail.subject}`)
  assert(Buffer.byteLength(mail.htmlBody) < 102 * 1024, `Stays under the 102 KB where Gmail clips an email, which would hide the logos: ${mail.subject}`)
  // Classic Outlook's table of the same pieces must be whole, or it could swallow the rest of the email.
  const outlook = [...mail.htmlBody.matchAll(/<!--\[if mso\]>(.*?)<!\[endif\]-->/g)].map(match => match[1]).join('')
  for (const tag of ['table', 'tr', 'td']) assert.equal(outlook.split(`<${tag}`).length, outlook.split(`</${tag}>`).length, `Classic Outlook's <${tag}>s all close: ${mail.subject}`)
}
// The website's Supported by strip (PartnerStrip) names no one the emails leave out.
const siteEntries = [...readFileSync(new URL('../src/data/partners.ts', import.meta.url), 'utf8').matchAll(/\{ name: '([^']+)'[^\n]*\}/g)].filter(entry => !entry[0].includes('individual: true')).map(entry => ({ name: entry[1], logo: entry[0].match(/logo: '([^']+)'/)?.[1] }))
for (const partner of siteEntries.filter((partner, index, all) => !partner.logo || all.findIndex(other => other.logo === partner.logo) === index)) assert(context.ATT_SUPPORTERS.some(supporter => supporter.name.includes(partner.name)), `${partner.name} is on the site's strip, so its logo is in the emails too`)
// Each picture is drawn at twice the size the email shows it, and kept small, as several load at once.
const pictureFile = name => readFileSync(new URL(`../public/images/email/${name}`, import.meta.url))
for (const speaker of panel.speakers) { const file = pictureFile(speaker.picture); assert(file.readUInt32BE(16) === 224 && file.readUInt32BE(20) === 326 && file.length < 100 * 1024, `${speaker.picture} is 224 x 326 and under 100 KB`) }
for (const supporter of context.ATT_SUPPORTERS) { const file = pictureFile(supporter.picture); assert(file.readUInt32BE(16) === 250 && file.readUInt32BE(20) === 120 && file.length < 10 * 1024, `${supporter.picture} is 250 x 120 and under 10 KB`) }
const quotaForReal = context.MailApp.getRemainingDailyQuota, mailedBeforeGuard = mailed.length
context.MailApp.getRemainingDailyQuota = () => everyEvent.length + 19
assert.throws(() => context.sendEveryEventTest(), /left in today's MailApp quota/, 'It keeps some of the day\'s quota back for real attendees')
context.MailApp.getRemainingDailyQuota = quotaForReal
assert.equal(mailed.length, mailedBeforeGuard, 'Stopped by the quota check, it sends nothing at all')
const nextRegistration = db().registrations.find(row => row.attendeeId === thanksPerson('thanks-going@example.invalid').id && row.eventId === 'workshop-1')
now = Date.parse('2026-11-07T15:30:00Z'); assert.equal(call('checkIn', { registrationId: nextRegistration.id }, admin).ok, true)
now = Date.parse('2026-11-07T23:59:00Z'); quiet(() => context.sendFollowUpsForLatestEvent())
assert.equal(db().deliveries.filter(row => row.eventId === 'workshop-1' && ['thanks', 'missed'].includes(row.type)).length, 0, 'A manual catch-up waits until each follow-up is due')
now = Date.parse('2026-11-08T01:00:00Z'); quiet(() => context.sendFollowUpsForLatestEvent())
const caughtUp = db().deliveries.filter(row => row.type === 'thanks' && row.eventId === 'workshop-1')
assert.equal(caughtUp.length, 1, 'A manual catch-up queues the latest event that has ended')
assert.equal(caughtUp[0].manual, true)
assert.notEqual(caughtUp[0].status, 'held', 'Running the catch-up approves what it queues')
assert.equal(db().deliveries.filter(row => row.type === 'missed' && row.eventId === 'workshop-1').length, 0, 'Missed-you letters for it are not due until 10 AM')
now = beforeThanks

// Emails to a whole event's list wait for an organiser's approval, which can be given ahead and lapses on a change.
{
  model = db()
  const at = iso => Date.parse(iso), w1 = () => model.events.find(event => event.id === 'workshop-1')
  const batch = (eventId, type, when) => context.attEmailBatches_(model, when).find(item => item.eventId === eventId && item.type === type)
  const reminders = () => model.deliveries.filter(row => row.type === 'reminder' && row.eventId === 'workshop-1')
  const ahead = at('2026-11-05T12:00:00Z'), due = at('2026-11-06T15:01:00Z')
  assert(batch('workshop-1', 'reminder', ahead).state === 'needsApproval' && batch('workshop-1', 'reminder', ahead).expected > 0 && !reminders().length, 'Listed before it is due, with who it would go to, and nothing queued')
  assert.equal(batch('workshop-1', 'reminder', ahead).dueAt, '2026-11-06T15:00:00.000Z', 'A reminder is due a day before its event')
  context.attDecide_(model, w1(), 'reminder', 'approve', ahead)
  assert.equal(batch('workshop-1', 'reminder', ahead).state, 'approved')
  assert(context.attEvents_(model, ahead).every(event => !('emailReview' in event)), 'Organisers\' decisions stay off the public schedule')
  context.attMaintenance_(model, due)
  assert(reminders().length > 0 && reminders().every(row => row.status === 'pending'), 'An approval given ahead lets the reminders go when they are due')
  assert.equal(batch('workshop-1', 'reminder', due).state, 'sending')
  // A preview is the email itself, for a real reader, and saves nothing: not even the secure link it creates.
  const tokens = model.tokens.length, saved = JSON.stringify(model.deliveries)
  const preview = context.attPreview_(model, w1(), 'reminder', undefined, due)
  assert(preview.subject === 'Reminder: Workshop 1: Problem, Insight & Story' && preview.htmlBody.includes('See you soon!') && !preview.sample, 'The preview is the reminder itself')
  assert.equal(preview.recipients.length, reminders().length, 'It names everyone it goes to')
  assert(model.tokens.length === tokens && JSON.stringify(model.deliveries) === saved, 'A preview saves nothing')
  if (preview.recipients.length > 1) assert.equal(context.attPreview_(model, w1(), 'reminder', preview.recipients[1].id, due).recipient.id, preview.recipients[1].id, 'Any reader\'s copy can be shown')
  assert(!model.checkins.some(row => row.eventId === 'workshop-2'), 'Fixture: nobody has checked in to Workshop 2')
  const card = context.attPreview_(model, model.events.find(event => event.id === 'workshop-2'), 'thanks', undefined, ahead)
  assert(card.sample && /^Thank you for coming to Workshop 2/.test(card.subject) && model.checkins.length === db().checkins.length, 'Before anyone has checked in, a card is shown as an example, without saving a check-in')
  // Changing what the email says lapses the approval and holds what hasn't gone; a moved reminder is dropped.
  context.attHandle_(model, { action: 'saveEvent', event: { ...w1(), venue: 'A new room, second floor' }, actor: admin }, due + 60000)
  assert(reminders().every(row => row.status === 'held') && batch('workshop-1', 'reminder', due + 60000).state === 'waiting', 'A change to the event holds an approved email again')
  assert.equal(context.attHandle_(model, { action: 'saveEvent', event: { ...w1(), capacity: w1().capacity }, actor: admin }, due + 70000).ok, true)
  context.attDecide_(model, w1(), 'reminder', 'approve', due + 80000)
  context.attHandle_(model, { action: 'saveEvent', event: { ...w1(), status: 'full' }, actor: admin }, due + 90000)
  assert(reminders().every(row => row.status === 'pending'), 'A change the email doesn\'t show leaves the approval standing')
  // Declining, approving again, withdrawing.
  context.attDecide_(model, w1(), 'reminder', 'decline', due + 100000)
  assert(reminders().every(row => row.status === 'skipped' && row.lastError === context.ATT_DECLINED) && batch('workshop-1', 'reminder', due + 100000).state === 'declined')
  context.attDecide_(model, w1(), 'reminder', 'approve', due + 110000)
  assert(reminders().every(row => row.status === 'pending'), 'A declined email can still be approved')
  context.attDecide_(model, w1(), 'reminder', 'undo', due + 120000)
  assert(reminders().every(row => row.status === 'held'), 'Withdrawing an approval holds what hasn\'t gone')
  // Nobody approved it in time: one note to the organisers (the tester in test mode), only once.
  const mailedBefore = mailed.length
  context.attNudge_(model, due + 130000); context.attNudge_(model, due + 140000)
  const nudges = mailed.slice(mailedBefore)
  assert(nudges.length === 1 && nudges[0].to === 'mail@example.invalid' && /waiting for your approval$/.test(nudges[0].subject) && nudges[0].body.includes('Reminder for Workshop 1: Problem, Insight & Story') && nudges[0].body.includes('https://hultprizeuwindsor.ca/organiser/events'), 'A due email nobody approved is flagged to the organisers once')
  assert.throws(() => context.attHandle_(model, { action: 'decideEmail', eventId: 'workshop-1', type: 'reminder', decision: 'approve', actor: admin }, at('2026-11-07T15:01:00Z')), /has started/, 'A reminder can\'t be approved once its event has begun')
  assert.equal(batch('workshop-1', 'reminder', at('2026-11-07T15:01:00Z')).state, 'closed')
  // A card approved after its evening still goes, as someone chose to send it.
  const info = model.events.find(event => event.id === 'info-session-1'), late = at('2026-10-31T12:00:00Z')
  context.attDecide_(model, info, 'thanks', 'approve', late)
  const lateCard = model.deliveries.find(row => row.type === 'thanks' && row.eventId === 'info-session-1')
  assert(lateCard.status === 'pending' && lateCard.manual === true && context.attEmail_(model, lateCard, late), 'An approved card goes even after its evening')
  // A newer update replaces one still waiting, so nobody gets both.
  const w5 = () => model.events.find(event => event.id === 'workshop-5'), updates = () => model.deliveries.filter(row => row.type === 'update' && row.eventId === 'workshop-5')
  assert(updates().length > 0 && updates().every(row => row.status === 'held'), 'Event updates wait for approval too')
  context.attHandle_(model, { action: 'saveEvent', event: { ...w5(), venue: 'Another full venue' }, actor: admin }, late)
  context.attHandle_(model, { action: 'sendUpdate', eventId: 'workshop-5', actor: admin }, late)
  const newest = 'update:workshop-5:' + w5().revision + ':'
  assert(updates().filter(row => row.status === 'held').every(row => row.key.startsWith(newest)) && updates().some(row => row.lastError === 'Replaced by a newer update.'), 'Only the newest update waits')
  // A cancellation notice waits too; personal emails never do.
  assert(model.deliveries.filter(row => row.type === 'eventCancelled').every(row => row.status === 'held'), 'Cancellation notices wait for approval')
  assert(model.deliveries.filter(row => ['confirmation', 'management', 'offer', 'offerExpired', 'cancellation'].includes(row.type)).every(row => row.status !== 'held'), 'Emails answering one person never wait')
  // With review off, everything sends by itself.
  props.ATTENDANCE_EMAIL_REVIEW = 'off'
  const automatic = db(); context.attMaintenance_(automatic, due)
  assert(automatic.deliveries.filter(row => row.type === 'reminder' && row.eventId === 'workshop-1').every(row => row.status === 'pending') && context.attEmailBatches_(automatic, ahead).find(item => item.eventId === 'founders-panel' && item.type === 'reminder').state === 'automatic', 'ATTENDANCE_EMAIL_REVIEW=off sends them by themselves')
  delete props.ATTENDANCE_EMAIL_REVIEW
}
// Through the web app: the preview is for organisers, changes nothing and sends nothing; approving releases the emails.
{
  const tokens = db().tokens.length, saved = JSON.stringify(db().deliveries), mailedBefore = mailed.length
  const shown = call('reviewEmail', { eventId: 'workshop-5', type: 'update' }, admin)
  assert(shown.ok && shown.subject.startsWith('Event update: ') && shown.recipients.length > 0, 'The preview comes back to the dashboard')
  assert(db().tokens.length === tokens && JSON.stringify(db().deliveries) === saved && mailed.length === mailedBefore, 'Previewing saves and sends nothing')
  assert.equal(call('reviewEmail', { eventId: 'workshop-5', type: 'update' }).code, 'unauthorized')
  assert(call('admin', {}, admin).emailBatches.some(item => item.eventId === 'workshop-5' && item.type === 'update' && item.state === 'waiting'), 'The dashboard lists what is waiting')
  assert.equal(call('decideEmail', { eventId: 'workshop-5', type: 'update', decision: 'approve' }, admin).ok, true)
  assert(db().deliveries.filter(row => row.type === 'update' && row.eventId === 'workshop-5').every(row => row.status !== 'held'), 'Approving releases them')
}

const csv = rosterCsv({ events: seed, attendees: [{ id: 'a', firstName: '=HYPERLINK("malicious")', email: '+malicious@example.invalid', category: 'community', dietary: 'SECRET SUPPORT' }], registrations: [{ id: 'r', attendeeId: 'a', eventId: 'info-session-1', status: 'confirmed' }], checkins: [] })
assert(csv.includes("'=HYPERLINK")); assert(!csv.includes('SECRET SUPPORT'))

// Proxy validation, signed sessions, CSRF, missing deployment, delivery receipts.
const env = { ATTENDANCE_ENDPOINT: 'https://script.google.com/macros/s/test/exec', ATTENDANCE_SHARED_SECRET: props.ATTENDANCE_SHARED_SECRET, ATTENDANCE_SESSION_SECRET: 'test-only-session-secret-with-at-least-32-chars', ATTENDANCE_ADMIN_PASSWORD: 'test-admin-password-123', ATTENDANCE_SUPPORT_PASSWORD: 'test-support-password-123' }
let forwarded = 0
async function invoke(action, fields = {}, options = {}) {
  const request = Readable.from([JSON.stringify({ action, ...fields })]); request.method = options.method || 'POST'; request.url = '/api/attendance?action=' + action
  request.headers = { 'content-type': 'application/json', origin: 'https://example.test', host: 'example.test', 'x-forwarded-for': client(), ...options.headers }
  const result = {}, response = { writeHead: (status, headers) => { result.status = status; result.headers = headers }, end: body => { result.body = JSON.parse(body) } }
  await handleAttendance(request, response, { env, now, fetch: async (_url, init) => { forwarded++; const params = Object.fromEntries(new URLSearchParams(init.body)); assert(!JSON.parse(params.payload).password); return { ok: true, json: async () => context.doPost({ parameter: params }) } }, ...options.settings })
  return result
}
assert.equal((await invoke('register', submission('proxy@example.invalid'), { settings: { env: {} } })).status, 503)
assert.equal((await invoke('register', submission('proxy@example.invalid'), { headers: { origin: 'https://attacker.example' } })).status, 403)
assert.equal((await invoke('register', { ...submission('proxy@example.invalid'), website: 'spam' })).status, 400)
assert.equal(forwarded, 0)
assert.equal((await invoke('manage', {}, { method: 'GET' })).status, 401)
assert.equal((await invoke('admin', {}, { method: 'GET' })).status, 401)
const login = await invoke('login', { password: env.ATTENDANCE_ADMIN_PASSWORD })
assert.equal(login.status, 200); assert.equal(login.body.canViewSupport, false)
assert(login.headers['Set-Cookie'].includes('HttpOnly; SameSite=Strict'))
assert(login.headers['Set-Cookie'].includes('; Secure'))
assert.equal((await invoke('login', { password: 'wrong' })).status, 401)
const organiser = { cookie: login.headers['Set-Cookie'].split(';')[0] }, forwardedBeforeReview = forwarded
assert.equal((await invoke('reviewEmail', { eventId: 'workshop-5', type: 'update' })).status, 401, 'Only organisers can preview emails')
assert.equal((await invoke('decideEmail', { eventId: 'workshop-5', type: 'confirmation', decision: 'approve' }, { headers: organiser })).status, 400, 'Only emails to a whole list are approved')
assert.equal((await invoke('decideEmail', { eventId: 'workshop-5', type: 'update', decision: 'send' }, { headers: organiser })).status, 400)
assert.equal((await invoke('reviewEmail', { eventId: 'workshop-5', type: 'update', attendeeId: '../x' }, { headers: organiser })).status, 400)
assert.equal(forwarded, forwardedBeforeReview, 'Rejected review requests never reach the script')
const supportLogin = await invoke('login', { password: env.ATTENDANCE_SUPPORT_PASSWORD })
assert.equal(supportLogin.body.canViewSupport, true)
assert.equal((await invoke('admin', {}, { method: 'GET', headers: { cookie: supportLogin.headers['Set-Cookie'].split(';')[0] } })).body.canViewSupport, true)
const memberCookie = 'hult_attendance_member=' + createSession({ kind: 'member', attendeeId: studentId, exp: now + 1000 }, env.ATTENDANCE_SESSION_SECRET)
assert.equal((await invoke('manage', {}, { method: 'GET', headers: { cookie: memberCookie } })).body.attendee.email, 'student@example.invalid')
assert.equal((await invoke('manage', {}, { method: 'GET', headers: { cookie: memberCookie + 'tampered' } })).status, 401)
assert.equal((await invoke('register', submission('proxy@example.invalid', ['workshop-1']), { settings: { fetch: async () => ({ ok: true, json: async () => ({ ok: true }) }) } })).status, 502)
assert.equal((await invoke('events', {}, { method: 'GET', settings: { fetch: async () => { throw Error('network') } } })).status, 502)
const rateClient = client()
for (let i = 0; i < 10; i++) assert.equal(context.doPost({ parameter: { secret: props.ATTENDANCE_SHARED_SECRET, payload: JSON.stringify({ action: 'rateCheck', clientKey: rateClient }) } }).ok, true)
assert.equal(context.doPost({ parameter: { secret: props.ATTENDANCE_SHARED_SECRET, payload: JSON.stringify({ action: 'rateCheck', clientKey: rateClient }) } }).code, 'rate_limited', 'Login limits persist in shared storage across requests')
const adminClient = client()
for (let i = 0; i < 35; i++) assert.equal(context.doPost({ parameter: { secret: props.ATTENDANCE_SHARED_SECRET, payload: JSON.stringify({ action: 'checkIn', actor: admin, registrationId: walkinReg.id, clientKey: adminClient }) } }).ok, true, 'Door check-ins have a separate generous authenticated rate limit')
const logout = await invoke('logout')
assert(logout.headers['Set-Cookie'].every(value => value.includes('Max-Age=0')))

now = Date.parse('2028-02-06T12:00:00Z')
model = db(); context.attMaintenance_(model, now); context.attCommit_(model)
assert(db().attendees.every(row => !row.email && !row.firstName && row.anonymizedAt))
assert.equal(db().consents.length, 0); assert.equal(db().tokens.length, 0); assert.equal(db().deliveries.length, 0)
assert.equal(sheets.get('journal').rows[1][0], '')
assert.equal(lockHeld, false)
console.log('Passed attendance validation, mixed selections, duplicate privacy, serialized capacity, lock rejection, FIFO reserved offers/expiry, single-use hashed tokens, ownership, support roles, journal recovery, email guard/failure/retry, DST/calendar content, reminders, thank-you cards and missed-you letters, walk-ins/check-ins, updates/cancellation, email review (approval ahead, lapsing on change, decline, withdraw, previews that save nothing, the organiser alert), CSV safety, proxy auth/CSRF/configuration, and retention. Spreadsheet and MailApp are fully mocked; no live emails or services used.')
