import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const watchdog = setTimeout(() => process.exit(1), 45000)
const browser = await chromium.launch({ channel: 'chrome', timeout: 10000 })
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.setDefaultTimeout(10000)
    await page.goto('http://127.0.0.1:5174/about', { waitUntil: 'domcontentloaded' })
    const tree = page.locator('.team-tree')
    await tree.scrollIntoViewIfNeeded()
    const rows = tree.locator('.team-tree__row')
    assert.equal(await rows.count(), 3)
    assert.equal(await rows.nth(0).locator('article').count(), 1)
    assert.equal(await rows.nth(1).locator('article').count(), 3)
    assert.equal(await rows.nth(2).locator('article').count(), 3)
    assert.equal(await tree.locator('article').count(), 7)
    await tree.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode() })))
    if (width > 700) {
      const box = await tree.boundingBox()
      const director = await rows.first().locator('article').boundingBox()
      assert(Math.abs(director.x + director.width / 2 - box.x - box.width / 2) < 1)
      assert.equal(await tree.locator('.team-tree__branches').count(), 0)
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await tree.screenshot({ path: `/tmp/hult-team-tree-${width}.png` })
    const trigger = tree.locator('.code-hover-card__surface').first()
    await trigger.focus()
    await page.keyboard.press('Enter')
    assert(await tree.locator('.code-hover-card.is-active').count() > 0)
    await page.close()
  }
  console.log('Passed: director/lead/coordinator rows, centred director, no connecting branches, responsive layout and portrait interaction.')
} finally { await browser.close(); clearTimeout(watchdog) }
