import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const watchdog = setTimeout(() => { console.error('Motion check timeout'); process.exit(1) }, 90000)
const browser = await chromium.launch({ channel: 'chrome', timeout: 10000 })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 } })
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' })
  const card = page.locator('.entry-card').first()
  assert.notEqual(await card.getAttribute('data-motion-pending'), null)
  await card.scrollIntoViewIfNeeded()
  const samples = await card.evaluate(el => new Promise(resolve => {
    const values = []
    const frame = () => { values.push(Number(getComputedStyle(el).opacity)); if (values.length < 45) requestAnimationFrame(frame); else resolve(values) }
    requestAnimationFrame(frame)
  }))
  assert(samples.some(n => n > 0 && n < 1), 'reveal has intermediate opacity')
  assert.equal(await card.getAttribute('data-motion-pending'), null)
  await page.evaluate(() => scrollTo(0, 0))
  await card.scrollIntoViewIfNeeded()
  assert.equal(await card.evaluate(el => getComputedStyle(el).opacity), '1', 'entrance does not replay')
  await page.goto('http://127.0.0.1:5174/about', { waitUntil: 'domcontentloaded' })
  const portrait = page.locator('.team-tree__card').last()
  await portrait.locator('.code-hover-card__surface').focus()
  assert.equal(await portrait.getAttribute('data-motion-pending'), null, 'keyboard focus reveals card immediately')
  assert.equal(await portrait.evaluate(el => getComputedStyle(el).opacity), '1')
  await page.keyboard.press('Enter')
  assert.equal(await portrait.locator('.code-hover-card__surface').getAttribute('aria-expanded'), 'true')
  await page.keyboard.press('Escape')
  await page.goto('http://127.0.0.1:5174/compete', { waitUntil: 'domcontentloaded' })
  const faq = page.locator('.faq details').first()
  await faq.locator('summary').click()
  assert.notEqual(await faq.getAttribute('open'), null)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  assert(await page.getByText('Please enter your name.').isVisible())
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/about', '/year-one', '/this-year', '/events', '/compete', '/partners', '/contact']) {
      await page.goto(`http://127.0.0.1:5174${route}`, { waitUntil: 'domcontentloaded' })
      assert.equal(await page.locator('[data-motion-pending]').count(), 0, `${route}: reduced-motion content visible`)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route}: overflow`)
      assert.equal(await page.locator('.site-footer__social a').count(), 7)
      if (route === '/') {
        assert.equal(await page.locator('.stat-band [data-count-up]').count(), 0)
        assert.equal(await page.locator('h1 [data-count-up]').count(), 1)
        assert.equal(await page.locator('h1 [data-count-up]').getAttribute('data-count-up'), '$1,000,000')
      }
    }
  }
  assert.deepEqual(errors, [])
  await page.close()
  console.log('Passed: scroll animation, once-only entrances, keyboard reveals, team overlays, FAQ/form feedback, eight responsive pages, reduced motion and unchanged homepage numbers.')
} finally { await browser.close(); clearTimeout(watchdog) }
