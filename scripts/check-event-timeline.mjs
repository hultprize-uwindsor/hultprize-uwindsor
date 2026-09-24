import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const watchdog = setTimeout(() => { console.error('Timeline check timed out'); process.exit(1) }, 45000)
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: 'chrome', timeout: 10000 })
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    page.setDefaultTimeout(10000)
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
    const cards = page.locator('.event-timeline__card')
    assert.equal(await cards.count(), 5)
    // The national site has no scroll reveals, so the cards are simply there.
    for (const card of await cards.all()) {
      assert.equal(await card.getAttribute('data-reveal'), null)
      assert.equal(await card.evaluate(el => getComputedStyle(el).opacity), '1')
      assert.equal(await card.evaluate(el => getComputedStyle(el).transform), 'none')
    }
    const bounds = await cards.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, bottom: r.bottom } }))
    assert(bounds.every((r, i) => i === 0 || (r.y > bounds[i - 1].bottom && r.x === bounds[0].x)))
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.locator('#key-dates').screenshot({ path: `/tmp/hult-event-timeline-${width}.png` })
    await page.close()
  }
  console.log('Passed: five vertical cards, visible without scroll reveals, responsive layout.')
} finally { await browser.close(); clearTimeout(watchdog) }
