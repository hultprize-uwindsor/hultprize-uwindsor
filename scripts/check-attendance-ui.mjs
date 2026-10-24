import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

// All attendance API traffic is intercepted. This script never creates live registrations or emails.
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
})
const events = JSON.parse(await readFile(new URL('../shared/attendance-events.json', import.meta.url), 'utf8'))
events.find(event => event.id === 'workshop-5').status = 'full'
events.find(event => event.id === 'workshop-5').capacity = 1
const requests = []
const errors = []
let failEvents = false
let failRegistration = false
let verificationRequired = false
let authenticated = false
let attendee = { firstName: 'Test', lastName: 'Student', email: 'attendance-test@example.invalid', category: 'undergraduate', institution: 'University of Windsor', faculty: 'Engineering', organisation: '', role: '', withTeam: true, teamName: 'Test Venture', dietary: '', accessibility: '', referral: '' }
let registrations = []
const snapshot = () => ({ ok: true, attendee, events, registrations: registrations.map(registration => ({ ...registration, event: events.find(event => event.id === registration.eventId) })) })

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  // Concurrent development must not reload a filled form midway through this synthetic check.
  await page.routeWebSocket('**', socket => socket.close())
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.setFixedTime(new Date('2026-10-22T16:00:00Z'))
  await page.route('**/api/attendance*', async route => {
    const request = route.request()
    const payload = request.method() === 'GET' ? { action: new URL(request.url()).searchParams.get('action') } : request.postDataJSON()
    requests.push(payload)
    const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
    if (payload.action === 'events') return failEvents ? respond({ ok: false, message: 'Registration is not connected.' }, 503) : respond({ ok: true, events })
    if (payload.action === 'register') {
      if (failRegistration) return respond({ ok: false, message: 'We could not save your registration. Please try again.' }, 503)
      if (verificationRequired) return respond({ ok: true, verificationRequired: true })
      attendee = payload.attendee
      registrations = payload.eventIds.map((eventId, index) => ({ id: `registration-${index}`, eventId, status: events.find(event => event.id === eventId).status === 'full' ? 'waitlisted' : 'confirmed' }))
      return respond({ ...snapshot(), saved: true, attendee: { firstName: attendee.firstName, lastName: attendee.lastName }, manageUrl: '/attend/manage' })
    }
    if (payload.action === 'exchange') { authenticated = payload.token === 'synthetic-single-use-token'; return authenticated ? respond({ ok: true }) : respond({ ok: false, message: 'This link has expired. Please request a new email link.' }, 401) }
    if (payload.action === 'acceptOffer') { authenticated = true; return respond(snapshot()) }
    if (payload.action === 'manage') return authenticated ? respond(snapshot()) : respond({ ok: false, message: 'Please verify your email.' }, 401)
    if (payload.action === 'cancel') { registrations = registrations.map(registration => registration.id === payload.registrationId ? { ...registration, status: 'cancelled' } : registration); return respond(snapshot()) }
    if (payload.action === 'addEvents') {
      for (const eventId of payload.eventIds) {
        registrations = registrations.filter(registration => registration.eventId !== eventId)
        registrations.push({ id: `added-${eventId}`, eventId, status: events.find(event => event.id === eventId).status === 'full' ? 'waitlisted' : 'confirmed' })
      }
      return respond(snapshot())
    }
    if (payload.action === 'updateDetails') { attendee = { ...attendee, dietary: payload.dietary, accessibility: payload.accessibility }; return respond(snapshot()) }
    if (payload.action === 'requestLink') return respond({ ok: true })
    if (payload.action === 'logout') { authenticated = false; return respond({ ok: true }) }
    return respond({ ok: false, message: `Unexpected test action: ${payload.action}` }, 400)
  })

  async function fillPerson(category = 'undergraduate') {
    await page.locator('[name=firstName]').fill('Test')
    await page.locator('[name=lastName]').fill(category === 'sponsor' ? 'Sponsor' : 'Student')
    await page.locator('[name=email]').fill('attendance-test@example.invalid')
    await page.locator('[name=category]').selectOption(category)
    if (category === 'undergraduate') {
      await page.locator('[name=institutionChoice]').selectOption('University of Windsor')
      await page.locator('[name=faculty]').selectOption('Engineering')
    } else if (category === 'sponsor') await page.locator('[name=organisation]').fill('Synthetic Test Partner')
    await page.locator('[name=consent]').check()
  }

  await page.goto(`${base}/attend?events=info-session-1&team=Test%20Venture`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Register for selected events' }).waitFor()
  assert.equal(await page.locator('.attendance-event-card').count(), 10)
  assert(await page.locator('#attendance-info-session-1').isChecked(), 'event link preselects event')
  assert.equal(await page.locator('[name=teamName]').inputValue(), 'Test Venture')
  assert.equal(await page.locator('[name=marketingConsent]').isChecked(), false, 'marketing starts unticked')
  assert.equal(await page.locator('input[type=tel]').count(), 0)
  await fillPerson()
  await page.getByRole('button', { name: 'Select all five workshops', exact: true }).click()
  await page.locator('#attendance-workshop-2').uncheck()
  assert.equal(await page.locator('.attendance-event-card input:checked').count(), 5)
  await mkdir('/tmp/hult-attendance-ui', { recursive: true })
  await page.screenshot({ path: '/tmp/hult-attendance-ui/desktop.png', fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '/tmp/hult-attendance-ui/desktop-top.png' })
  await page.getByRole('button', { name: 'Register for selected events' }).click()
  await page.getByRole('heading', { name: 'You’re registered, with a waitlist too.' }).waitFor()
  const studentRequest = requests.find(request => request.action === 'register')
  assert.equal(studentRequest.attendee.category, 'undergraduate')
  assert.equal(studentRequest.eventIds.length, 5)
  assert.equal(studentRequest.marketingConsent, false)
  assert.equal(studentRequest.consent, true)
  assert.match(studentRequest.requestId, /^[a-f\d-]{36}$/i)
  assert.equal(await page.locator('.attendance-registration-list .attendance-status--confirmed').count(), 4)
  assert.equal(await page.locator('.attendance-registration-list .attendance-status--waitlisted').count(), 1)
  const share = new URL(await page.locator('#team-share-link').inputValue())
  assert.deepEqual([...share.searchParams.keys()].sort(), ['events', 'team'])
  assert(!share.href.includes('attendance-test') && !share.href.includes('Student'), 'share link contains no attendee identity')
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes('attendance-test')), false, 'personal data stays out of browser storage')
  const calendarLink = await page.getByRole('link', { name: 'Google Calendar' }).first().getAttribute('href')
  assert.equal(new URL(calendarLink).searchParams.get('dates'), '20261029T203000Z/20261029T213000Z')
  assert.equal(new URL(calendarLink).searchParams.get('ctz'), 'America/Toronto')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Apple / Outlook (.ics)' }).first().click()])
  const ics = await readFile(await download.path(), 'utf8')
  assert.match(ics, /DTSTART:20261029T203000Z/)
  assert.match(ics, /DTEND:20261029T213000Z/)
  const formatting = await page.evaluate(async () => {
    const lib = await import('/src/lib/attendance.ts')
    const before = lib.attendanceSeedEvents.find(event => event.id === 'info-session-1')
    const after = lib.attendanceSeedEvents.find(event => event.id === 'workshop-1')
    return { before: lib.eventTime(before), after: lib.eventTime(after), workshopCalendar: lib.googleCalendarUrl(after) }
  })
  assert.match(formatting.before, /4:30/)
  assert.match(formatting.after, /10:00/)
  assert.equal(new URL(formatting.workshopCalendar).searchParams.get('dates'), '20261107T150000Z/20261107T172000Z', 'DST changes UTC offset while preserving 10am Windsor start')

  await page.goto(`${base}/attend/manage#token=synthetic-single-use-token`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Your registrations', exact: true }).waitFor()
  assert.equal(new URL(page.url()).hash, '', 'email credential stripped from URL')
  assert.equal(requests.filter(request => request.action === 'exchange').length, 1, 'Strict Mode does not reuse a single-use email token')
  await page.locator('[name=dietary]').fill('Vegetarian')
  await page.locator('[name=accessibility]').fill('Step-free access')
  await page.getByRole('button', { name: 'Save support details' }).click()
  await page.getByText('Your dietary and accessibility details have been saved.').waitFor()
  assert.equal(attendee.accessibility, 'Step-free access')
  await page.getByRole('button', { name: 'Cancel this registration for Info Session #1' }).click()
  await page.getByRole('button', { name: 'Yes, cancel this event' }).click()
  await page.getByText('Your registration has been cancelled. Your other events are unchanged.').waitFor()
  assert.equal(registrations.find(registration => registration.eventId === 'info-session-1').status, 'cancelled')
  assert.equal(registrations.find(registration => registration.eventId === 'workshop-1').status, 'confirmed')
  await page.locator('#manage-founders-panel').check()
  await page.getByRole('button', { name: 'Add selected events' }).click()
  await page.getByText('Your events have been updated. Check each event’s confirmed or waitlisted status above.').waitFor()
  assert(registrations.some(registration => registration.eventId === 'founders-panel' && registration.status === 'confirmed'))
  await page.getByRole('button', { name: 'Sign out of attendance' }).click()
  await page.getByRole('heading', { name: 'A secure link, sent to you.' }).waitFor()
  assert.equal(await page.locator('.attendance-registration').count(), 0, 'sign-out removes personal attendance from the page')
  assert.equal(authenticated, false)

  // A sponsor receives only professional fields, and repeat submissions reveal no roster.
  verificationRequired = true
  await page.goto(`${base}/attend?events=founders-panel`, { waitUntil: 'networkidle' })
  await fillPerson('sponsor')
  assert.equal(await page.locator('[name=institutionChoice]').count(), 0)
  assert.equal(await page.locator('[name=faculty]').count(), 0)
  await page.getByRole('button', { name: 'Register for selected events' }).click()
  await page.getByRole('heading', { name: 'Check your email to continue.' }).waitFor()
  assert.equal(await page.locator('.attendance-registration').count(), 0)
  const sponsorRequest = requests.filter(request => request.action === 'register').at(-1)
  assert.equal(sponsorRequest.attendee.organisation, 'Synthetic Test Partner')
  assert.equal(sponsorRequest.attendee.institution, '')

  // Submission failure keeps the form and supports a retry with the same idempotency key.
  verificationRequired = false
  failRegistration = true
  await page.goto(`${base}/attend?events=info-session-1`, { waitUntil: 'networkidle' })
  await fillPerson()
  await page.getByRole('button', { name: 'Register for selected events' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('[name=email]').inputValue(), 'attendance-test@example.invalid')
  assert.equal(await page.locator('#registration-confirmation').count(), 0)
  const retryId = requests.filter(request => request.action === 'register').at(-1).requestId
  failRegistration = false
  await page.getByRole('button', { name: 'Register for selected events' }).click()
  await page.getByRole('heading', { name: 'You’re registered!', exact: true }).waitFor()
  assert.equal(requests.filter(request => request.action === 'register').at(-1).requestId, retryId)

  // Narrow viewport, keyboard event toggling, and reduced-motion feedback.
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${base}/attend`, { waitUntil: 'networkidle' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'mobile form has no horizontal overflow')
  await page.locator('#attendance-info-session-1').focus()
  await page.keyboard.press('Space')
  assert(await page.locator('#attendance-info-session-1').isChecked(), 'event cards work from keyboard')
  const motion = await page.locator('.attendance-event-card').first().evaluate(element => getComputedStyle(element).transitionDuration)
  assert.equal(motion, '0s')
  await page.screenshot({ path: '/tmp/hult-attendance-ui/mobile.png', fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: '/tmp/hult-attendance-ui/mobile-top.png' })
  await page.setViewportSize({ width: 320, height: 812 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, '320px form has no horizontal overflow')

  failEvents = true
  await page.goto(`${base}/attend`, { waitUntil: 'networkidle' })
  await page.getByText('Registration is temporarily unavailable.', { exact: false }).waitFor()
  assert(await page.getByRole('button', { name: 'Register for selected events' }).isDisabled(), 'unconnected schedule cannot appear to accept registrations')
  assert.equal(await page.locator('.attendance-event-card').count(), 10, 'reference schedule remains available offline')
  failEvents = false
  authenticated = false
  await page.goto(`${base}/attend/manage#token=expired-synthetic-token`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'A secure link, sent to you.' }).waitFor()
  assert.equal(await page.locator('.attendance-registration').count(), 0)
  assert.equal(new URL(page.url()).hash, '')
  await page.locator('[name=email]').fill('unregistered@example.invalid')
  await page.getByRole('button', { name: 'Email my secure link' }).click()
  await page.getByText('If this address has event registrations, a secure link will arrive by email.', { exact: false }).waitFor()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('Attendee UI passed: student multi-event registration, sponsor conditional fields, private team sharing, mixed waitlist receipt, generic repeat flow, idempotent retry, secure management/cancellation/additions, UTC calendars across DST, mobile/keyboard/reduced-motion, and honest offline state. All API responses were synthetic; no live emails were sent.')
} finally {
  await browser.close()
}
