import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
const errors = []
try {
  for (const width of [390, 1440]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/partners`)
    const trigger = page.locator('a.partner-tile[href$="?partner=fusion"]')
    const drawer = page.locator('.story-drawer')
    await trigger.click()
    await page.waitForURL('**/partners?partner=fusion')
    await page.waitForTimeout(650)
    assert(await drawer.evaluate(el => el.matches(':modal')))
    const before = await page.evaluate(() => scrollY)
    await page.goBack()
    await page.waitForURL('**/partners')
    if (reducedMotion === 'no-preference') {
      assert(await drawer.isVisible(), 'browser Back retains drawer during its exit')
      assert.equal(await drawer.getAttribute('data-motion'), 'exit')
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden', 'page stays locked during history exit')
    }
    await drawer.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
    assert(await trigger.evaluate(el => document.activeElement === el), 'history exit returns focus to its original card')
    assert(Math.abs(await page.evaluate(() => scrollY) - before) < 4, 'history exit preserves the background scroll')
    await page.goForward()
    await drawer.waitFor({ state: 'visible' })
    await page.waitForTimeout(650)
    if (reducedMotion === 'no-preference') {
      // Forward can cancel an in-progress Back transition without leaking a body lock.
      await page.goBack()
      await page.waitForURL('**/partners')
      await page.goForward()
      await page.waitForURL('**/partners?partner=fusion')
      await page.waitForTimeout(700)
      assert(await drawer.isVisible())
      assert.equal(await drawer.getAttribute('data-motion'), 'enter')
    }
    await drawer.getByRole('link', { name: 'Explore the partnership' }).click()
    await page.waitForURL('**/partners/fusion')
    await drawer.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
    assert(await page.locator('main').evaluate(el => document.activeElement === el), 'new page receives focus when original card is removed')
    await page.goto(`${base}/partners?partner=fusion&source=history-check`)
    await drawer.waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await drawer.waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).search, '?source=history-check', 'direct-link close retains unrelated query parameters')
    await page.goto(`${base}/year-one?photo=0`)
    await drawer.waitFor({ state: 'visible' })
    await drawer.getByRole('button', { name: 'Next' }).click()
    await page.waitForURL('**/year-one?photo=1')
    await drawer.getByRole('button', { name: 'Previous' }).click()
    await page.waitForURL('**/year-one?photo=0')
    await drawer.getByRole('button', { name: 'Close panel' }).click()
    await drawer.waitFor({ state: 'hidden' })
    assert.equal(new URL(page.url()).search, '')
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
    await page.close()
  }
  assert.deepEqual(errors, [])
  console.log('Passed: Back/Forward animated drawer presence, interrupted exits, focus and scroll restoration, canonical navigation, direct query cleanup, gallery navigation; desktop/mobile and reduced motion.')
} finally { await browser.close() }
