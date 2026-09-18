import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const watchdog = setTimeout(() => { console.error('Timeline check timed out'); process.exit(1) }, 45000)
const browser = await chromium.launch({ channel: 'chrome', timeout: 10000 })
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } })
    page.setDefaultTimeout(10000)
    await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' })
    const cards = page.locator('.event-timeline__card')
    assert.equal(await cards.count(), 5)
    assert.equal(await cards.first().getAttribute('data-reveal'), 'pending')
    assert.equal(await cards.first().evaluate(el => getComputedStyle(el).opacity), '0')
    assert(await cards.first().evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41 > 0))
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded()
      await page.waitForFunction(el => el.dataset.reveal === 'visible', await card.elementHandle())
    }
    await page.waitForTimeout(800)
    assert.equal(await cards.last().evaluate(el => getComputedStyle(el).opacity), '1')
    const bounds = await cards.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, bottom:r.bottom } }))
    assert(bounds.every((r,i) => i === 0 || (r.y > bounds[i-1].bottom && r.x === bounds[0].x)))
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.locator('#key-dates').screenshot({ path: `/tmp/hult-event-timeline-${width}.png` })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    assert.equal(await cards.first().evaluate(el => getComputedStyle(el).opacity), '1')
    assert.equal(await cards.first().evaluate(el => getComputedStyle(el).transform), 'none')
    await page.close()
  }
  console.log('Passed: five vertical cards, scroll reveals from the right, responsive layout, and reduced motion.')
} finally { await browser.close(); clearTimeout(watchdog) }
