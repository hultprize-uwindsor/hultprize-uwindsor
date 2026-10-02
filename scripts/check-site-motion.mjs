import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const launch = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}
const browser = await chromium.launch({ ...launch, args: ['--enable-unsafe-swiftshader'] })
const errors = []
const failures = []

async function newPage(options) {
  const page = await browser.newPage(options)
  page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }))
  await page.route('https://maps.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Map preview</html>' }))
  return page
}

async function assertSelected(page, index) {
  await page.waitForFunction(value => document.getElementById(`journey-tab-${value}`)?.getAttribute('aria-selected') === 'true', index)
  const selected = page.locator('[role="tab"][aria-selected="true"]')
  assert.equal(await selected.count(), 1, 'one journey stage is selected')
  assert.equal(await selected.getAttribute('tabindex'), '0')
  const controls = await selected.getAttribute('aria-controls')
  await page.locator(`[id="${controls}"]`).waitFor({ state: 'visible' })
  assert(await page.locator(`[id="${controls}"]`).isVisible(), 'selected tab controls a visible panel')
  assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), `journey-tab-${index}`)
  assert.equal(await page.locator('.journey-experience__stage.is-active').count(), 1, 'one panel has the active scene')
  assert.equal(await page.locator('.journey-experience__stage').count(), 3, 'all three panels remain mounted for transitions')
  assert.equal(await page.locator('.journey-experience__stage[aria-hidden="true"][inert]').count(), 2, 'inactive panels are inert and hidden from assistive technology')
}

async function journeyKeyboard(page) {
  await page.locator('#journey-tab-0').click()
  await assertSelected(page, 0)
  await page.keyboard.press('ArrowRight')
  await assertSelected(page, 1)
  await page.keyboard.press('End')
  await assertSelected(page, 2)
  await page.keyboard.press('ArrowRight')
  await assertSelected(page, 0)
  await page.keyboard.press('ArrowLeft')
  await assertSelected(page, 2)
  await page.keyboard.press('Home')
  await assertSelected(page, 0)
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'journey-tab-0', 'focus follows tab activation')
  const missing = await page.getByRole('tab').evaluateAll(tabs => tabs.filter(tab => !document.getElementById(tab.getAttribute('aria-controls'))).map(tab => tab.id))
  assert.deepEqual(missing, [], 'all tab controls resolve')
}

async function drawerChecks(width) {
  const page = await newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' })
  await page.goto(base + '/about')
  const member = page.locator('.person-tile').first()
  await member.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => scrollY)
  await member.click()
  const drawer = page.locator('.story-drawer')
  await drawer.waitFor()
  assert.equal(await drawer.evaluate(element => element.open), true)
  assert.equal(await page.getByRole('button', { name: 'Close panel' }).evaluate(element => element === document.activeElement), true, 'drawer close control receives focus')
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden', 'background scroll locks')
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    assert(await drawer.evaluate(element => element.contains(document.activeElement)), 'drawer retains keyboard focus')
  }
  await page.keyboard.press('Shift+Tab')
  assert(await drawer.evaluate(element => element.contains(document.activeElement)), 'reverse tab navigation stays in the drawer')
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'detached' })
  assert.equal(new URL(page.url()).search, '', 'Escape removes drawer URL state')
  assert(await member.evaluate(element => element === document.activeElement), 'focus returns to member card')
  assert(Math.abs(await page.evaluate(() => scrollY) - before) <= 3, 'closing restores underlying scroll position')
  assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden', 'scroll lock releases')

  await member.click()
  await drawer.waitFor()
  await page.goBack()
  await drawer.waitFor({ state: 'detached' })
  await page.goForward()
  await drawer.waitFor()
  assert.equal(await drawer.evaluate(element => element.open), true, 'Forward reopens the drawer')
  await page.reload()
  await drawer.waitFor()
  assert.equal(await drawer.evaluate(element => element.open), true, 'refresh preserves the profile')
  await page.getByRole('button', { name: 'Close panel' }).click()
  await drawer.waitFor({ state: 'detached' })

  // A directly opened URL has no drawer-origin history entry: close stays on its parent page.
  await page.goto(base + '/about?member=mahnoz-akhtari')
  await drawer.waitFor()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await drawer.waitFor({ state: 'detached' })
  assert.equal(new URL(page.url()).pathname, '/about')
  assert.equal(new URL(page.url()).search, '')

  await page.goto(base + '/partners')
  await page.locator('.partner-tile').first().click()
  await drawer.waitFor()
  const fullProfile = drawer.getByRole('link', { name: /Explore the partnership/ })
  const destination = await fullProfile.getAttribute('href')
  await fullProfile.click()
  await page.waitForURL(base + destination)
  await drawer.waitFor({ state: 'detached' })
  assert.notEqual(await page.locator('main h1').textContent(), 'Page not found')

  await page.goto(base + '/year-one')
  await page.locator('main h1').waitFor()
  const photos = page.locator('.season-gallery__grid > a')
  const count = await photos.count()
  if (count > 1) {
    await photos.first().click()
    await drawer.waitFor()
    const original = await drawer.locator('.story-drawer__body > img').getAttribute('src')
    assert(await drawer.getByRole('button', { name: /Previous/ }).isDisabled())
    await drawer.getByRole('button', { name: /Next/ }).click()
    await page.waitForURL(/photo=1/)
    await page.waitForFunction(src => document.querySelector('.story-drawer__body > img')?.getAttribute('src') !== src, original)
    assert.notEqual(await drawer.locator('.story-drawer__body > img').getAttribute('src'), original)
    await drawer.getByRole('button', { name: /Previous/ }).click()
    await page.waitForFunction(src => document.querySelector('.story-drawer__body > img')?.getAttribute('src') === src, original)
    assert.equal(await drawer.locator('.story-drawer__body > img').getAttribute('src'), original)
    await page.keyboard.press('Escape')
    await drawer.waitFor({ state: 'detached' })
    assert.equal(new URL(page.url()).search, '', 'gallery navigation does not accumulate history entries')
    await photos.last().click()
    assert(await drawer.getByRole('button', { name: /Next/ }).isDisabled())
    await page.keyboard.press('Escape')
    await drawer.waitFor({ state: 'detached' })
  } else {
    console.log(`${width}px: event-photo gallery is disabled by publication settings; gallery controls not applicable.`)
  }
  await page.close()
  console.log(`PASS ${width}px drawer focus, history, direct URLs, profile navigation${count > 1 ? ', gallery controls' : ''}`)
}

async function scrollInstant(page, top) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('lenis-scrolling'))
  await page.evaluate(value => window.scrollTo({ top: value, behavior: 'instant' }), top)
  await page.waitForTimeout(180)
}

async function introChecks(page) {
  const bounds = await page.locator('.floating-intro').evaluate(element => ({ top: element.getBoundingClientRect().top + scrollY, travel: element.offsetHeight - innerHeight }))
  const snapshot = async progress => {
    await scrollInstant(page, bounds.top + bounds.travel * progress)
    return page.locator('.floating-intro').evaluate(element => {
      const centre = element.querySelector('.floating-intro__centre')
      const matrix = new DOMMatrix(getComputedStyle(centre).transform)
      const sticky = element.querySelector('.floating-intro__sticky').getBoundingClientRect()
      const cards = [...element.querySelectorAll('.floating-card')].map(card => {
        const rect = card.getBoundingClientRect()
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      })
      const separation = Math.hypot(cards[0].x - cards[2].x, cards[0].y - cards[2].y)
      const words = [...element.querySelectorAll('.intro-action')].map(row => ({ opacity: Number(getComputedStyle(row).opacity), y: new DOMMatrix(getComputedStyle(row).transform).m42 }))
      const heading = element.querySelector('h2')
      const rect = heading.getBoundingClientRect()
      const paintedHeading = document.elementsFromPoint(Math.max(1, Math.min(innerWidth - 1, rect.x + rect.width / 2)), Math.max(1, Math.min(innerHeight - 1, rect.y + rect.height / 2))).includes(heading)
      return { scale: matrix.a, titleOpacity: Number(getComputedStyle(centre).opacity), separation, stickyTop: sticky.top, stickyWidth: sticky.width, viewportWidth: innerWidth, paintedHeading, words }
    })
  }
  const start = await snapshot(.03)
  const middle = await snapshot(.3)
  const gathered = await snapshot(.53)
  const words = await snapshot(.96)
  assert(start.stickyWidth >= start.viewportWidth * .98 && middle.stickyWidth >= middle.viewportWidth * .98, 'pinned scene has a real full-width clipping box')
  assert(start.paintedHeading, 'visible heading passes viewport hit testing instead of being clipped by a zero-width scene')
  assert(start.scale > 1.5 && middle.scale < start.scale * .65 && gathered.scale < middle.scale * .4, 'heading continuously shrinks through scroll progress')
  assert(gathered.separation < start.separation * .1, 'independent cards converge into the centre stack')
  assert(middle.separation > gathered.separation && middle.separation < start.separation, 'card gathering is continuous, not a threshold switch')
  assert(Math.abs(middle.stickyTop) < 2 && Math.abs(gathered.stickyTop) < 2, 'scene remains pinned while title and cards move')
  assert(start.words.every(word => word.opacity === 0 && word.y > 300), 'action words begin out of view')
  assert(words.words.every(word => word.opacity === 1 && Math.abs(word.y) < 1), 'Build, Pitch and Compete arrive in a complete stack')
  assert(words.titleOpacity === 0, 'small title leaves before action words finish')
  console.log('PASS pinned title shrink, continuous card convergence and staggered action-word arrival')
}

async function journeyChecks(page) {
  await page.locator('.journey-experience').scrollIntoViewIfNeeded()
  await journeyKeyboard(page)
  assert(await page.getByRole('button', { name: 'Play journey sequence' }).isVisible(), 'manual selection pauses playback')
  await page.getByRole('button', { name: 'Play journey sequence' }).click()
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.journey-experience')).getPropertyValue('--journey-playback')) > .12)
  await page.waitForFunction(() => document.getElementById('journey-tab-1')?.getAttribute('aria-selected') === 'true', null, { timeout: 9000 })
  await assertSelected(page, 1)
  await page.getByRole('button', { name: 'Pause journey sequence' }).click()
  const progress = await page.locator('.journey-experience').evaluate(element => getComputedStyle(element).getPropertyValue('--journey-playback'))
  await page.waitForTimeout(250)
  assert.equal(await page.locator('.journey-experience').evaluate(element => getComputedStyle(element).getPropertyValue('--journey-playback')), progress, 'paused stage progress stays still')
  const visibleLink = page.getByRole('tabpanel').getByRole('link', { name: /How to compete/ })
  await visibleLink.focus()
  assert(await visibleLink.evaluate(element => element === document.activeElement), 'active scene CTA is keyboard accessible')
  console.log('PASS automatic stage playback, direct keyboard controls, pause and inert inactive panels')
}

async function smoothHistoryChecks(page) {
  await scrollInstant(page, 0)
  assert(await page.locator('html').evaluate(element => element.classList.contains('lenis')), 'smooth-scroll engine is active')
  await page.mouse.wheel(0, 650)
  await page.waitForTimeout(40)
  const early = await page.evaluate(() => scrollY)
  await page.waitForFunction(() => !document.documentElement.classList.contains('lenis-scrolling'))
  const late = await page.evaluate(() => scrollY)
  assert(early > 0 && early < late - 30 && late > 500, 'wheel scroll interpolates across frames')
  const saved = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - 350)
  await scrollInstant(page, saved)
  const before = await page.evaluate(() => scrollY)
  assert(before > 5000 && Math.abs(before - saved) < 3, 'history test begins deep in the homepage')
  await page.locator('.site-header__nav a[href="/contact"]').click()
  await page.waitForURL(base + '/contact')
  await page.waitForTimeout(250)
  assert(await page.evaluate(() => scrollY) < 3, `new routes begin at the top (got ${await page.evaluate(() => scrollY)})`)
  await page.goBack()
  await page.waitForURL(base + '/')
  await page.waitForTimeout(350)
  assert(Math.abs(await page.evaluate(() => scrollY) - before) < 5, 'Back restores a deep scroll position after a shorter route')
  await page.goto(base + '/contact')
  await page.locator('.site-footer a[href="/compete#signup"]').first().click()
  await page.waitForURL(base + '/compete#signup')
  await page.waitForTimeout(350)
  assert(Math.abs(await page.locator('#signup').evaluate(element => element.getBoundingClientRect().top) - 28) < 5, 'cross-route signup hash aligns after route dimensions change')
  console.log('PASS smooth wheel interpolation, route reset, deep history restoration and cross-route hash')
}

try {
  for (const width of [390, 1440]) {
    try { await drawerChecks(width) }
    catch (error) { failures.push(`${width}px drawer: ${error.message}`); console.log(`FAIL ${width}px drawer: ${error.message}`) }
  }
  const page = await newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' })
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  for (const [name, check] of [['intro choreography', introChecks], ['journey playback', journeyChecks], ['smooth history', smoothHistoryChecks]]) {
    try { await check(page) }
    catch (error) { failures.push(`${name}: ${error.message}`); console.log(`FAIL ${name}: ${error.message}`) }
  }

  await page.goto(base)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  const intro = page.locator('.floating-intro')
  assert.equal(await intro.locator('.floating-intro__sticky').evaluate(element => getComputedStyle(element).position), 'relative', 'reduced-motion intro returns to natural document flow')
  assert.equal(await intro.locator('.floating-intro__centre').evaluate(element => getComputedStyle(element).transform), 'none', 'reduced-motion title does not zoom')
  assert(await intro.locator('.floating-card').evaluateAll(cards => cards.every(card => getComputedStyle(card).opacity === '1' && getComputedStyle(card).transform === 'none')), 'all five static cards remain visible')
  assert.equal(await page.locator('.home-hero .scene-control').count(), 0, 'hero has no pause control')
  assert.equal(await page.locator('html').evaluate(element => element.classList.contains('lenis')), false, 'live reduced-motion preference disables smooth-scroll engine')
  await journeyKeyboard(page)
  assert.equal(await page.locator('.journey-play').count(), 0, 'reduced-motion journey is manual')
  assert.equal(await page.locator('.journey-experience__sticky').evaluate(element => getComputedStyle(element).position), 'relative')
  assert(await page.getByText('Free entry. Free workshops.', { exact: true }).evaluate(element => !element.closest('[aria-hidden="true"]')), 'card copy remains available to assistive technology')
  await page.close()
  console.log('PASS live reduced motion: static cards, complete content, manual journey and native scroll')

  const mobile = await newPage({ viewport: { width: 390, height: 850 }, reducedMotion: 'no-preference' })
  await mobile.goto(base)
  await introChecks(mobile)
  await journeyKeyboard(mobile)
  assert.equal(await mobile.locator('.journey-experience__sticky').evaluate(element => getComputedStyle(element).position), 'relative', 'mobile journey stays in normal document flow')
  for (const width of [320, 390, 760]) {
    await mobile.setViewportSize({ width, height: 850 })
    await mobile.waitForTimeout(120)
    assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}px`)
  }
  await mobile.close()
  assert.deepEqual(errors, [], 'no browser runtime errors')
  assert.deepEqual(failures, [], 'behavior failures')
  console.log('Site motion checks passed: drawers, gallery, history, focus, scroll choreography, timed/manual journey, reduced motion and mobile layout.')
} finally { await browser.close() }
