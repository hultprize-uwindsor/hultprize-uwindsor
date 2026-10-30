import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
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
now = Date.parse('2026-10-29T23:01:00Z'); context.attendanceMaintenance()
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, 0, 'Automatic follow-ups stay off until ATTENDANCE_FOLLOW_UP_MODE is auto')
props.ATTENDANCE_FOLLOW_UP_MODE = 'auto'
now = Date.parse('2026-10-29T22:59:00Z'); context.attendanceMaintenance()
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, 0, 'No cards before 7 PM')
now = Date.parse('2026-10-29T23:01:00Z'); context.attendanceMaintenance()
const checkedIn = db().checkins.filter(row => row.eventId === 'info-session-1')
assert.equal(db().deliveries.filter(row => row.type === 'thanks').length, checkedIn.length, 'One card per check-in, walk-ins included')
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
const nextRegistration = db().registrations.find(row => row.attendeeId === thanksPerson('thanks-going@example.invalid').id && row.eventId === 'workshop-1')
now = Date.parse('2026-11-07T15:30:00Z'); assert.equal(call('checkIn', { registrationId: nextRegistration.id }, admin).ok, true)
now = Date.parse('2026-11-07T23:59:00Z'); quiet(() => context.sendFollowUpsForLatestEvent())
assert.equal(db().deliveries.filter(row => row.eventId === 'workshop-1' && ['thanks', 'missed'].includes(row.type)).length, 0, 'A manual catch-up waits until each follow-up is due')
now = Date.parse('2026-11-08T01:00:00Z'); quiet(() => context.sendFollowUpsForLatestEvent())
const caughtUp = db().deliveries.filter(row => row.type === 'thanks' && row.eventId === 'workshop-1')
assert.equal(caughtUp.length, 1, 'A manual catch-up queues the latest event that has ended')
assert.equal(caughtUp[0].manual, true)
assert.equal(db().deliveries.filter(row => row.type === 'missed' && row.eventId === 'workshop-1').length, 0, 'Missed-you letters for it are not due until 10 AM')
now = beforeThanks
delete props.ATTENDANCE_FOLLOW_UP_MODE

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
console.log('Passed attendance validation, mixed selections, duplicate privacy, serialized capacity, lock rejection, FIFO reserved offers/expiry, single-use hashed tokens, ownership, support roles, journal recovery, email guard/failure/retry, DST/calendar content, reminders, thank-you cards and missed-you letters, walk-ins/check-ins, updates/cancellation, CSV safety, proxy auth/CSRF/configuration, and retention. Spreadsheet and MailApp are fully mocked; no live emails or services used.')
