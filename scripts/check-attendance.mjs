import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
    formatDate: (date, timeZone, pattern) => new Intl.DateTimeFormat('en-CA', { timeZone, ...(pattern.startsWith('EEEE') ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : pattern.startsWith('MMMM') ? { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' } : { hour: 'numeric', minute: '2-digit', ...(pattern.includes('z') ? { timeZoneName: 'short' } : {}) }) }).format(date),
  },
  SpreadsheetApp: { openById: () => spreadsheet, flush: () => {} },
  LockService: { getScriptLock: () => ({ waitLock: () => { assert(!lockHeld); lockHeld = true; lockUses++ }, tryLock: () => { if (lockHeld) return false; lockHeld = true; lockUses++; return true }, releaseLock: () => { lockHeld = false } }) },
  MailApp: { sendEmail: mail => { if (mailFails) throw Error('Mock quota exceeded'); mailed.push(mail) } },
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
console.log('Passed attendance validation, mixed selections, duplicate privacy, serialized capacity, lock rejection, FIFO reserved offers/expiry, single-use hashed tokens, ownership, support roles, journal recovery, email guard/failure/retry, DST/calendar content, reminders, walk-ins/check-ins, updates/cancellation, CSV safety, proxy auth/CSRF/configuration, and retention. Spreadsheet and MailApp are fully mocked; no live emails or services used.')
