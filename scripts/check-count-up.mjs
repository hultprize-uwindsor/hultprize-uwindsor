import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ channel: 'chrome' })
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5174'
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 700 } })
  await page.goto(`${base}/year-one`)
  const first = page.locator('[data-count-up="14"]')
  await first.waitFor({ state: 'attached' })
  assert((await first.boundingBox()).y > 700)
  assert.equal(await first.locator('.count-up__value').innerText(), '0')
  await first.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const n = Number(document.querySelector('[data-count-up="14"] .count-up__value').textContent)
    return n > 0 && n < 14
  })
  await page.waitForTimeout(1800)
  assert.equal(await first.locator('.count-up__value').innerText(), '14')
  await page.evaluate(() => scrollTo(0, 0))
  await first.scrollIntoViewIfNeeded()
  assert.equal(await first.locator('.count-up__value').innerText(), '14', 'does not restart')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/year-one', '/this-year', '/partners']) {
      await page.goto(base + route)
      await page.locator('[data-count-up]').first().waitFor()
      await page.waitForFunction(() => [...document.querySelectorAll('[data-count-up]')].every(el => el.querySelector('.count-up__value').textContent === el.dataset.countUp))
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} ${width}: overflow`)
    }
  }
  console.log('Count-up checks passed: viewport trigger, intermediate values, final values, no replay, reduced motion, currency/targets, mobile and desktop.')
} finally { await browser.close() }
