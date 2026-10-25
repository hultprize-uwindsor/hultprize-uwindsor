import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const events = JSON.parse(await readFile(new URL('../shared/attendance-events.json', import.meta.url), 'utf8'))
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
try {
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await page.clock.setFixedTime(new Date('2026-10-22T16:00:00Z'))
    // No calls reach live registration services, even if the dev server is configured.
    await page.route('**/api/attendance*', route => route.fulfill({ json: { ok: true, events } }))
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    assert.match(await page.locator('#key-dates').innerText(), /Mark Your\s+Calendars/)
    // The homepage wall calendar opens on the next event's month, in Windsor time.
    const calendar = page.locator('#key-dates')
    await calendar.locator('.calendar-day--marked').first().waitFor()
    assert.match(await calendar.locator('#calendar-month').innerText(), /October\s+2026/)
    assert.equal(await calendar.getByRole('button', { name: 'Previous month' }).isDisabled(), true, 'the first event month has no earlier page')
    assert.equal(await calendar.locator('a.calendar-day[href="/attend?events=info-session-1"]').getAttribute('aria-label'), 'Info Session #1, Thursday, October 29')
    assert.equal(await calendar.locator('.calendar-day.is-today').innerText(), '22')
    const notes = calendar.locator('.notepad-item')
    assert.equal(await notes.count(), 6, 'the notepad lists the next five events and the registration deadline')
    assert.equal(await notes.first().getAttribute('href'), '/attend?events=info-session-1')
    assert.match(await notes.last().innerText(), /Team registration closes/)
    await calendar.getByRole('button', { name: 'Next month' }).click()
    assert.match(await calendar.locator('#calendar-month').innerText(), /November\s+2026/)
    assert.equal(await calendar.locator('.calendar-day--marked').count(), 7, 'six November events and the November 20 deadline are circled')
    assert.equal(await calendar.locator('.calendar-day--marked.mark--deadline').getAttribute('href'), 'https://www.hultprize.org/register')
    for (let step = 0; step < 3; step++) await calendar.getByRole('button', { name: 'Next month' }).click()
    assert.match(await calendar.locator('#calendar-month').innerText(), /February\s+2027/)
    assert.equal(await calendar.locator('.calendar-day--marked.mark--finale').innerText(), '4', 'the finale is circled on February 4 in Windsor time')
    assert.equal(await calendar.getByRole('button', { name: 'Next month' }).isDisabled(), true, 'the last event month has no later page')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the calendar fits the viewport')
    // The "Up next" ticket is the next event, counted down in Windsor days (October 22 to 29).
    assert.equal(await page.locator('.up-next-ticket').getAttribute('href'), '/attend?events=info-session-1')
    assert.equal(await page.locator('.up-next-ticket__countdown').innerText(), 'In 7 days')
    assert.match(await page.locator('.up-next-ticket__stub').innerText(), /Oct\s+29\s+Thursday/i)
    await page.locator('a[href="/this-year#calendar"]').first().click()
    await page.waitForURL('**/this-year#calendar')
    await page.locator('.timeline--full li').first().waitFor()
    const rows = await page.locator('.timeline--full li').allTextContents()
    assert.equal(rows.length, 10)
    events.forEach((event, i) => {
      assert(rows[i].includes(event.title))
      assert(rows[i].includes(event.venue))
    })
    assert.match(rows[9], /Feb 4, 2027/)
    assert(!rows.some(row => /UWill|Nationals|Touch base/.test(row)))
    assert.equal(await page.locator('.timeline--full a[href^="/attend?events="]').count(), 10)
    assert.match(await page.locator('#calendar').innerText(), /Competition registration closes November 20, 2026/)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.goto(`${base}/events`, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.locator('.attendance-catalogue__grid article').count(), 10)
    await page.locator('.attendance-catalogue__grid a[href="/events/workshop-1"]').click()
    assert.match(await page.locator('main').innerText(), /FRCT/)
    assert.equal(await page.locator('main a[href="/attend?events=workshop-1"]').count(), 1)
    // An administrator edit is reflected by every consumer on the next read.
    await page.unroute('**/api/attendance*')
    await page.route('**/api/attendance*', route => route.fulfill({ json: { ok: true, events: events.map(event => event.id === 'workshop-1' ? { ...event, venue: 'Updated test venue', startsAt: '2026-11-07T16:00:00Z' } : event) } }))
    await page.goto(`${base}/this-year#calendar`)
    await page.getByText(/Updated test venue/).waitFor()
    assert.match(await page.locator('.timeline--full li').nth(1).innerText(), /11:00 a\.m\.|11:00 AM/i)
    await page.close()
  }
  console.log('Passed: homepage wall calendar (opening month, Windsor dates, deadline, notepad, month bounds), shared live catalogue, event-specific links, ten chronological events, administrator schedule edits and mobile layout at 320/1440px.')
} finally { await browser.close() }
