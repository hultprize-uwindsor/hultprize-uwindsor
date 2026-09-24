import { chromium } from 'playwright'
import assert from 'node:assert/strict'
// Motion follows hultprize.org: no page fade, scroll reveals or count-ups; the header hides on
// scroll down and returns with a shadow on scroll up; buttons scale only their background pill.
const watchdog = setTimeout(() => { console.error('Motion check timeout'); process.exit(1) }, 90000)
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: 'chrome', timeout: 10000 })
const errors = []
const pill = button => button.evaluate(el => getComputedStyle(el, '::before').transform)
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 800 } })
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  await page.locator('main h1').waitFor()
  assert.equal(await page.locator('main').evaluate(el => el.getAnimations().length), 0, 'no page fade')
  const card = page.locator('.entry-card').first()
  await card.scrollIntoViewIfNeeded()
  assert.equal(await card.evaluate(el => el.getAnimations().length + Number(getComputedStyle(el).opacity !== '1')), 0, 'no scroll reveal')
  assert.equal(await page.locator('.stat-band strong').first().innerText(), '14', 'stats show final values')

  const header = page.locator('.site-header')
  await page.evaluate(() => scrollTo(0, 900))
  await page.waitForTimeout(250)
  assert.match(await header.getAttribute('class'), /site-header--hidden/, 'header hides on scroll down')
  await page.evaluate(() => scrollBy(0, -40))
  await page.waitForTimeout(250)
  assert.doesNotMatch(await header.getAttribute('class'), /site-header--hidden/, 'header returns on scroll up')
  assert.notEqual(await header.evaluate(el => getComputedStyle(el).boxShadow), 'none', 'returning header is raised')
  assert.equal(await header.evaluate(el => getComputedStyle(el).transitionDuration.split(',')[0]), '0.15s')

  await page.evaluate(() => scrollTo(0, 0))
  const register = page.locator('.home-hero .btn--primary')
  await register.hover()
  await page.waitForTimeout(250)
  assert.equal(await pill(register), 'matrix(1.05, 0, 0, 1.05, 0, 0)', 'hover scales the pill')
  assert.equal(await register.evaluate(el => getComputedStyle(el).transform), 'none', 'label does not move')

  await page.goto(`${base}/about`, { waitUntil: 'domcontentloaded' })
  const portrait = page.locator('.team-tree__card').last()
  await portrait.locator('.code-hover-card__surface').focus()
  await page.keyboard.press('Enter')
  assert.equal(await portrait.locator('.code-hover-card__surface').getAttribute('aria-expanded'), 'true')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.code-hover-card__characters').first().evaluate(el => getComputedStyle(el).fontFamily.startsWith('"EF Circular VF"')), true, 'one typeface only')
  await page.goto(`${base}/compete`, { waitUntil: 'domcontentloaded' })
  const faq = page.locator('.faq details').first()
  await faq.locator('summary').click()
  assert.notEqual(await faq.getAttribute('open'), null)
  await page.getByRole('button', { name: 'Sign up', exact: true }).click()
  assert(await page.getByText('Please enter your name.').isVisible())

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' })
  const reducedRegister = page.locator('.home-hero .btn--primary')
  await reducedRegister.hover()
  assert.equal(await pill(reducedRegister), 'none', 'reduced motion: no pill scale')
  assert.equal(await page.locator('.site-header').evaluate(el => getComputedStyle(el).transitionDuration), '0s', 'reduced motion: header toggles instantly')
  await page.goto(`${base}/about`, { waitUntil: 'domcontentloaded' })
  const surface = page.locator('.code-hover-card__surface').first()
  await surface.hover()
  assert.equal(await surface.evaluate(el => getComputedStyle(el).scale), 'none', 'reduced motion: team card does not scale')

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/about', '/year-one', '/this-year', '/events', '/compete', '/partners', '/contact']) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' })
      await page.locator('main h1').waitFor()
      assert.equal(await page.locator('[data-motion-pending], [data-count-up], [data-reveal]').count(), 0, `${route}: no reveals or count-ups`)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route}: overflow`)
    }
  }
  assert.deepEqual(errors, [])
  await page.close()
  console.log('Passed: no page fade, reveals or count-ups; hide-on-scroll header; pill hover; team overlay, FAQ and form feedback; one typeface; reduced motion; eight pages at two widths.')
} finally { await browser.close(); clearTimeout(watchdog) }
