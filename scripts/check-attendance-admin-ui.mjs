import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const events = JSON.parse(await readFile(new URL('../shared/attendance-events.json', import.meta.url), 'utf8'))
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Tokyo', reducedMotion: 'reduce', acceptDownloads: true })
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', error => pageErrors.push(error.message))
const people = [
  { id: 'person1', firstName: 'Ada', lastName: 'Example', email: 'ada@example.test', category: 'undergraduate', institution: 'University of Windsor', faculty: 'Engineering', teamName: '=2+2', dietary: 'SUPPORT_DIETARY_ONLY', accessibility: 'SUPPORT_ACCESS_ONLY' },
  { id: 'person2', firstName: 'Jo', lastName: 'Sponsor', email: 'jo@example.test', category: 'sponsor', organisation: 'Example partner', dietary: '', accessibility: '' },
]
const registrations = [
  { id: 'registration1', attendeeId: 'person1', eventId: events[0].id, status: 'confirmed' },
  { id: 'registration2', attendeeId: 'person1', eventId: events[1].id, status: 'confirmed' },
  { id: 'registration3', attendeeId: 'person2', eventId: events[0].id, status: 'waitlisted' },
]
const checkins = []
const deliveries = [{ id: 'delivery1', attendeeId: 'person1', eventId: events[0].id, type: 'confirmation', status: 'failed', attempts: 1, lastError: 'Test-only email failure' }]
const payloads = []
let signedIn = false
let supportAccess = false
let failWalkIn = false

// Every attendance request is intercepted. No registration or email reaches a live service.
await context.route('**/api/attendance*', async route => {
  const request = route.request()
  const payload = request.method() === 'GET' ? { action: new URL(request.url()).searchParams.get('action') } : request.postDataJSON()
  if (request.method() === 'POST') payloads.push(payload)
  const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  if (payload.action === 'login') { signedIn = true; supportAccess = payload.password === 'support-fixture'; return reply({ ok: true, canViewSupport: supportAccess }) }
  if (payload.action === 'logout') { signedIn = false; return reply({ ok: true }) }
  if (!signedIn) return reply({ ok: false, code: 'unauthorized' }, 401)
  if (payload.action === 'admin') return reply({ ok: true, events, registrations, checkins, deliveries, canViewSupport: supportAccess, attendees: people.map(person => { const copy = { ...person }; if (!supportAccess) { delete copy.dietary; delete copy.accessibility } return copy }) })
  if (payload.action === 'checkIn') { checkins.push({ id: 'checkin1', registrationId: payload.registrationId, checkedInAt: '2026-10-29T20:31:00Z' }); return reply({ ok: true }) }
  if (payload.action === 'saveEvent') { Object.assign(events.find(event => event.id === payload.event.id), payload.event); return reply({ ok: true, notificationRequired: true }) }
  if (payload.action === 'walkIn') return failWalkIn ? reply({ ok: false, message: 'Temporary test failure. Retry safely.' }, 503) : reply({ ok: true, saved: true })
  if (payload.action === 'retryEmail') { const delivery = deliveries.find(item => item.id === payload.deliveryId); delivery.status = 'pending'; delivery.lastError = ''; return reply({ ok: true }) }
  if (payload.action === 'sendUpdate') return reply({ ok: true, queued: 2 })
  throw new Error(`Unexpected mocked attendance action: ${payload.action}`)
})

async function signIn(password = 'organiser-fixture') {
  await page.getByLabel('Organiser password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: 'Find your attendees' }).waitFor()
}
async function csvDownload() {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export filtered CSV' }).click()
  const stream = await (await downloadPromise).createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}
async function count(label, expected) {
  const metric = page.locator('.attendance-admin__stats > div').filter({ has: page.getByText(label, { exact: true }) })
  await page.waitForFunction(({ label, expected }) => [...document.querySelectorAll('.attendance-admin__stats > div')].some(item => item.querySelector('span')?.textContent === label && item.querySelector('strong')?.textContent === String(expected)), { label, expected })
  assert.equal(await metric.locator('strong').textContent(), String(expected), label)
}

try {
  await page.goto(`${base}/organiser/events`)
  await signIn()
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'Admin credentials are not persisted in browser storage')
  assert(!page.url().includes('fixture'), 'Passwords never enter the URL')
  await count('Unique people', 2)
  await count('Event registrations', 3)
  await count('Actual check-ins', 0)
  assert.equal(await page.getByLabel('Show dietary and accessibility details').count(), 0)
  assert(!(await page.locator('body').textContent()).includes('SUPPORT_'), 'General organiser DOM excludes support data')

  await page.getByRole('button', { name: `Check in Ada Example for ${events[0].title}`, exact: true }).click()
  await count('Actual check-ins', 1)
  assert.equal(payloads.find(payload => payload.action === 'checkIn').registrationId, 'registration1')

  await page.getByLabel('Category', { exact: true }).selectOption('undergraduate')
  await count('Unique people', 1)
  await count('Event registrations', 2)
  await page.locator('.attendance-admin__event-filter > summary').click()
  await page.locator('.attendance-admin__event-filter').getByLabel(new RegExp(events[0].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).check()
  await count('Event registrations', 1)
  const eventCsv = await csvDownload()
  assert(eventCsv.includes('ada@example.test') && !eventCsv.includes('jo@example.test'), 'Filtered export respects category and event')
  assert(eventCsv.includes('"\'=2+2"'), 'CSV escapes formula-like team names')
  assert(!eventCsv.includes('Dietary') && !eventCsv.includes('SUPPORT_'), 'General roster CSV excludes support fields')
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await count('Event registrations', 3)

  await page.getByRole('button', { name: 'Manage events', exact: true }).click()
  const editor = page.locator('.attendance-admin__event-editor').first()
  await editor.locator('summary').click()
  assert.equal(await editor.getByLabel('Starts (Windsor time)').inputValue(), '2026-10-29T16:30', 'Tokyo browser displays Windsor wall-clock time')
  await editor.getByLabel('Starts (Windsor time)').fill('2026-11-07T10:00')
  await editor.getByLabel('Ends (Windsor time)').fill('2026-11-07T12:20')
  await editor.getByRole('button', { name: 'Save event', exact: true }).click()
  await page.getByRole('status').filter({ hasText: 'Event details saved.' }).waitFor()
  const winter = payloads.findLast(payload => payload.action === 'saveEvent').event
  assert.equal(winter.startsAt, '2026-11-07T15:00:00.000Z', 'November standard time uses UTC−05:00')
  assert.equal(winter.endsAt, '2026-11-07T17:20:00.000Z')
  assert.equal(winter.capacity, null, 'Blank capacity remains unconfigured')
  await editor.getByLabel('Starts (Windsor time)').fill('2026-10-29T16:30')
  await editor.getByLabel('Ends (Windsor time)').fill('2026-10-29T17:30')
  await editor.getByRole('button', { name: 'Save event', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.attendance-admin__notice')?.textContent.includes('Event details saved.'))
  await page.waitForFunction(() => !document.querySelector('.attendance-admin__event-editor button[type="submit"]')?.disabled)
  assert.equal(payloads.findLast(payload => payload.action === 'saveEvent').event.startsAt, '2026-10-29T20:30:00.000Z', 'October daylight time uses UTC−04:00')
  const savedCount = payloads.filter(payload => payload.action === 'saveEvent').length
  await editor.getByLabel('Starts (Windsor time)').fill('2027-03-14T02:30')
  await editor.getByLabel('Ends (Windsor time)').fill('2027-03-14T03:30')
  await editor.getByRole('button', { name: 'Save event', exact: true }).click()
  assert.match(await editor.getByRole('alert').textContent(), /does not exist/)
  await editor.getByLabel('Starts (Windsor time)').fill('2026-11-01T01:30')
  await editor.getByLabel('Ends (Windsor time)').fill('2026-11-01T02:30')
  await editor.getByRole('button', { name: 'Save event', exact: true }).click()
  assert.match(await editor.getByRole('alert').textContent(), /occurs twice/)
  assert.equal(payloads.filter(payload => payload.action === 'saveEvent').length, savedCount, 'DST gaps and ambiguous times do not submit')
  await editor.getByRole('button', { name: 'Email saved event update' }).click()
  await page.getByRole('status').filter({ hasText: '2 event update emails queued.' }).waitFor()

  await page.getByRole('button', { name: 'Record a walk-in', exact: true }).click()
  const walkin = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Record a walk-in' }) })
  await walkin.getByLabel('First name', { exact: true }).fill('Test')
  await walkin.getByLabel('Last name', { exact: true }).fill('Sponsor')
  await walkin.getByLabel('Email address', { exact: true }).fill('walkin@example.test')
  await walkin.getByLabel('Attendee category', { exact: true }).selectOption('undergraduate')
  assert.equal(await walkin.getByLabel('Institution', { exact: true }).getAttribute('required'), '')
  await walkin.getByLabel('Attendee category', { exact: true }).selectOption('sponsor')
  assert.equal(await walkin.getByLabel('Institution', { exact: true }).count(), 0, 'Sponsor does not see student-only fields')
  await walkin.getByLabel('Organisation', { exact: true }).fill('Test partner')
  assert.equal(await walkin.getByLabel(/Dietary requirements/).count(), 0, 'General staff cannot enter restricted support details')
  await walkin.getByLabel(new RegExp(events[0].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).check()
  await walkin.getByLabel(/The attendee acknowledges/).check()
  failWalkIn = true
  await walkin.getByRole('button', { name: 'Save walk-in & check in confirmed events' }).click()
  await page.getByRole('alert').filter({ hasText: 'Temporary test failure' }).waitFor()
  const failedId = payloads.findLast(payload => payload.action === 'walkIn').requestId
  failWalkIn = false
  await walkin.getByRole('button', { name: 'Save walk-in & check in confirmed events' }).click()
  await page.getByRole('status').filter({ hasText: 'Walk-in saved.' }).waitFor()
  const walkinPayload = payloads.findLast(payload => payload.action === 'walkIn')
  assert.equal(walkinPayload.requestId, failedId, 'Unchanged retry keeps its idempotency key')
  assert.equal(walkinPayload.marketingConsent, false)
  assert.equal(walkinPayload.consent, true)
  assert.equal(walkinPayload.attendee.institution, '')

  await page.getByRole('button', { name: /Email delivery/ }).click()
  assert.match(await page.locator('.attendance-admin__panel').textContent(), /Test-only email failure/)
  await page.getByRole('button', { name: 'Retry email', exact: true }).click()
  await page.getByText('No delivery issues.', { exact: true }).waitFor()
  assert.equal(payloads.filter(payload => payload.action === 'walkIn').length, 2, 'Retrying email never registers another attendee')
  deliveries.push({ id: 'delivery2', attendeeId: 'person2', eventId: events[0].id, type: 'confirmation', status: 'pending', attempts: 0, lastError: 'Email sending is disabled. Configure before launch.' })
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('Email sending is disabled. Configure before launch.', { exact: true }).waitFor()

  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await signIn('support-fixture')
  await page.getByRole('button', { name: 'Rosters & reports', exact: true }).click()
  assert(!(await page.locator('body').textContent()).includes('SUPPORT_'), 'Support details are hidden until requested')
  await page.getByLabel('Show dietary and accessibility details').check()
  assert((await page.locator('body').textContent()).includes('SUPPORT_DIETARY_ONLY'))
  assert(!(await csvDownload()).includes('SUPPORT_'), 'Support role exports exclude support by default')
  await page.getByLabel('Include support details in this export for authorised attendance preparation').check()
  assert((await csvDownload()).includes('SUPPORT_DIETARY_ONLY'), 'Explicit authorised preparation export includes support')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '/tmp/hult-attendance-admin-mobile.png', fullPage: true })
  const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth, elements: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1 && !element.closest('.attendance-admin__table-wrap')).map(element => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width })).slice(0, 12) }))
  assert(overflow.page <= overflow.viewport, `Mobile dashboard has no page-level horizontal overflow: ${JSON.stringify(overflow)}`)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: '/tmp/hult-attendance-admin-desktop.png', fullPage: true })
  for (const person of people) { delete person.firstName; delete person.lastName; delete person.email; person.anonymizedAt = '2028-02-05T00:00:00Z' }
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByText('Anonymised attendee', { exact: true }).first().waitFor()
  await count('Unique people', 2)
  assert.deepEqual(pageErrors, [], 'No uncaught browser errors')
  console.log('Passed: admin login, private support controls, unique people/registrations/check-ins, roster filters, safe CSV, Windsor DST conversion including invalid/ambiguous hours, sponsor walk-in validation and retry key, email retry, blocked pending email visibility, anonymised reports, material update, mobile overflow. All attendance requests intercepted; no live submissions or emails.')
} finally {
  await browser.close()
}
