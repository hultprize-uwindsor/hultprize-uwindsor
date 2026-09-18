import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const paths = ['/', '/about', '/year-one', '/this-year', '/events', '/compete', '/partners', '/contact']
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {})
const errors = []
mkdirSync('/tmp/hult-site-check', { recursive: true })
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    page.on('pageerror', error => errors.push(error.message))
    // Map availability is external; check its configured pin without loading Google.
    await page.route('https://maps.google.com/**', route => route.fulfill({ status: 200, body: '<html>Map</html>', contentType: 'text/html' }))
    for (const path of paths) {
      await page.goto(base + path)
      await page.locator('main h1').waitFor()
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('main h1').count(), 1, `${path}: one page heading`)
      const register = page.locator('.site-header__register a')
      assert.equal(await register.getAttribute('href'), 'https://www.hultprize.org/register')
      assert.equal(await register.getAttribute('target'), '_blank')
      assert.equal(await page.locator('form').count(), path === '/compete' ? 1 : 0)
      assert.equal(await page.locator('.site-footer__social a').count(), 7)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${path}: horizontal overflow`)
      await page.locator('img').evaluateAll(images => images.forEach(i => { i.loading = 'eager' }))
      await page.waitForFunction(() => [...document.images].every(i => i.complete))
      await page.locator('img').evaluateAll(images => Promise.all(images.map(i => i.decode().catch(() => {}))))
      const brokenImages = await page.locator('img').evaluateAll(images => images.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src))
      assert.deepEqual(brokenImages, [], `${path}: missing image`)
      assert.equal(await page.locator('.partner-strip .three-d-track').evaluate(el => getComputedStyle(el).transform), 'none')
      if (path === '/') await page.screenshot({ path: `/tmp/hult-site-check/${width}-hero.png` })
      if (path === '/about') await page.locator('.team-tree').screenshot({ path: `/tmp/hult-site-check/${width}-portraits.png` })
      if (path === '/' || path === '/about' || path === '/compete') await page.screenshot({ path: `/tmp/hult-site-check/${width}-${path.slice(1) || 'home'}.png`, fullPage: true })
    }
    await page.goto(base + '/year-one')
    const gallery = page.getByRole('region', { name: 'Hult Prize in pictures' })
    if (await gallery.count()) {
      const leaf = gallery.locator('.origin-left').nth(1)
      await leaf.waitFor()
      assert.equal(await gallery.getByRole('button').count(), 0)
      await page.keyboard.press('ArrowRight')
      assert.equal(await leaf.evaluate(el => el.style.transform), 'rotateY(-180deg)')
    }
    await page.goto(base + '/compete')
    const faq = page.locator('.faq details').first()
    assert.equal(await faq.getAttribute('open'), null)
    await faq.locator('summary').focus()
    await page.keyboard.press('Enter')
    assert.notEqual(await faq.getAttribute('open'), null)
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()
    assert(await page.getByText('Please enter your name.').isVisible())
    const socialLinks = await page.locator('.site-footer__social a').evaluateAll(as => as.map(a => a.getAttribute('href')))
    assert(socialLinks.includes('https://hultprizeatuwindsor.ca'))
    assert(socialLinks.includes('mailto:hultprizeatuwindsor@gmail.com'))
    assert.equal(socialLinks.filter(href => href.startsWith('https://signal.group/#')).length, 2)
    if (width === 375) {
      await page.getByRole('button', { name: 'Menu', exact: true }).click()
      await page.locator('.program-menu summary').click()
      await page.getByRole('link', { name: 'Year One', exact: true }).first().click()
      await page.waitForURL('**/year-one')
      assert.equal(await page.getByRole('button', { name: 'Menu', exact: true }).getAttribute('aria-expanded'), 'false')
      await page.getByRole('button', { name: 'Menu', exact: true }).click()
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('button', { name: 'Menu', exact: true }).getAttribute('aria-expanded'), 'false')
    }
    await page.goto(base + '/team')
    await page.waitForURL('**/about#team')
    await page.goto(base + '/go')
    await page.waitForURL('**/compete#signup')
    await page.goto(base + '/#signup')
    await page.waitForURL('**/compete#signup')
    await page.goto(base + '/events')
    assert.equal(await page.locator('.event-filters').count(), 0)
    assert.equal(await page.getByText('Hult Prize UWindsor has a home', { exact: true }).count(), 0)
    await page.getByRole('link', { name: 'Read details' }).click()
    await page.waitForURL('**/events/registration-closes-november-20')
    assert(await page.locator('main h1').innerText())
    await page.goto(base + '/events/fusion-launch')
    assert.equal(await page.locator('main h1').innerText(), 'Page not found')
    await page.close()
  }
  assert.deepEqual(errors, [])
  console.log('Passed: eight pages at 375px and 1440px; links, forms, FAQ keyboard controls, navigation, redirects, draft visibility, images and reduced motion.')
} finally {
  await browser.close()
}
