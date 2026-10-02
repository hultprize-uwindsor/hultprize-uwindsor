import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
try {
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    assert.equal(await page.locator('.event-timeline__card').count(), 5)
    assert.match(await page.locator('#key-dates').innerText(), /Mark Your\s+Calendars/)
    await page.locator('a[href="/this-year#calendar"]').first().click()
    await page.waitForURL('**/this-year#calendar')
    await page.locator('.timeline--full li').first().waitFor()
    const rows = await page.locator('.timeline--full li').allTextContents()
    assert.equal(rows.length, 7)
    const expected = [
      ['October 1, 2026', 'launch'],
      ['November 7, 2026', 'five sessions through January 9, 2027'],
      ['November 20, 2026', 'Registration closes'],
      ['January 2, 2027', 'Touch base'],
      ['February 5, 2027', 'Grand Finale'],
      ['March 13, 2027', 'Uwill Discover Conference'],
      ['April 10–11, 2027', 'Calgary'],
    ]
    rows.forEach((row, i) => expected[i].forEach(text => assert(row.includes(text), `calendar row ${i}: ${text}`)))
    assert.match(await page.locator('main').innerText(), /nine weeks/)
    assert.match(await page.locator('main').innerText(), /ends April 11, 2027/)
    assert(await page.locator('#calendar').evaluate(el => el.getBoundingClientRect().top < innerHeight))
    await page.goto(`${base}/about`, { waitUntil: 'domcontentloaded' })
    await page.locator('h1').waitFor()
    assert.match(await page.locator('main').innerText(), /\$1,000, \$500 and \$250/)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.close()
  }
  console.log('Passed: five compact milestones, all seven calendar dates, season end, nine-week preparation and campus prizes at 320/1440px.')
} finally { await browser.close() }
