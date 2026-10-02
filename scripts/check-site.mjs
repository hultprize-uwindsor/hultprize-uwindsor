import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const allPaths = [
  '/', '/about', '/year-one', '/this-year', '/compete', '/partners', '/contact', '/events',
  '/events/fusion-launch', '/events/registration-closes-november-20',
  '/partners/fusion', '/partners/sterling', '/partners/wetech', '/not-a-real-page',
]
const allViewports = [[320, 568], [390, 844], [768, 1024], [1024, 768], [1280, 800], [1920, 1080], [844, 390]]
const paths = process.env.CHECK_PATHS ? allPaths.filter(path => process.env.CHECK_PATHS.split(',').includes(path)) : allPaths
const viewports = process.env.CHECK_VIEWPORTS ? allViewports.filter(([width, height]) => process.env.CHECK_VIEWPORTS.split(',').includes(`${width}x${height}`)) : allViewports
const launch = process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}
const browser = await chromium.launch(launch)
const results = []
const errors = []
mkdirSync('/tmp/hult-site-audit', { recursive: true })
assert(paths.length && viewports.length, 'audit filters must match published routes and viewport sizes')

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width <= 1024, hasTouch: width <= 1024, reducedMotion: 'reduce' })
    // Keep the embedded map deterministic; this audit concerns the site's own rendering.
    await context.route('https://maps.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><title>Map preview</title></html>' }))
    const page = await context.newPage()
    page.on('pageerror', error => errors.push({ width, height, path: new URL(page.url()).pathname, message: error.message }))
    for (const path of paths) {
      const result = { width, height, path, failures: [] }
      try {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' })
        await page.locator('main h1').waitFor()
        await page.evaluate(() => document.fonts.ready)
        const headings = await page.locator('main h1').allTextContents()
        assert.equal(headings.length, 1, 'exactly one main page heading')
        assert(headings[0].trim(), 'page heading is not empty')
        const title = await page.title()
        if (path === '/not-a-real-page') {
          assert.match(headings[0], /page not found/i)
          assert.match(title, /page not found/i)
          assert(await page.locator('.recovery-links a').count() >= 3, '404 offers recovery routes')
        } else {
          assert.doesNotMatch(headings[0], /page not found/i)
          assert.doesNotMatch(title, /page not found/i)
        }
        await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager' }))
        await page.waitForFunction(() => [...document.images].every(image => image.complete), undefined, { timeout: 20_000 })
        await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => undefined))))
        const broken = await page.locator('img').evaluateAll(images => images.filter(image => !image.naturalWidth).map(image => image.getAttribute('src')))
        if (broken.length) result.failures.push(`images failed to load: ${JSON.stringify(broken)}`)
        result.size = await page.evaluate(() => ({ innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }))
        if (result.size.documentWidth > width + 1 || result.size.bodyWidth > width + 1) result.failures.push(`horizontal overflow beyond ${width}px viewport: ${JSON.stringify(result.size)}`)
        assert(await page.locator('main').isVisible(), 'main content is visible')
        result.hiddenReveals = await page.locator('main [data-motion], main .reveal-letter, .site-footer [data-motion]').evaluateAll(elements => elements.filter(element => {
          if (element.closest('[inert], [hidden], dialog:not([open])')) return false
          const style = getComputedStyle(element)
          return Number(style.opacity) < .99 || style.visibility === 'hidden' || (element.classList.contains('reveal-letter') && style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
        }).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent.trim().slice(0, 90) })))
        if (result.hiddenReveals.length) result.failures.push(`reduced motion hides reveal content: ${JSON.stringify(result.hiddenReveals.slice(0, 5))}`)
        result.clippedText = await page.locator('main h1, main h2, main h3, main h4, main p, main li, main a, main button, main label, main summary, main figcaption, .site-header a, .site-header button, .site-footer a, .site-footer button, .site-footer p, .site-footer h2').evaluateAll(elements => elements.filter(element => {
          if (!element.textContent.trim() || !element.clientWidth || element.scrollWidth <= element.clientWidth + 2) return false
          if (element.closest('[aria-hidden="true"], [inert], [hidden], dialog:not([open]), .visually-hidden, .sr-only, .brand-scene, .floating-intro__cards')) return false
          const style = getComputedStyle(element)
          if (style.visibility !== 'visible' || Number(style.opacity) < .99 || style.overflowX === 'auto' || style.overflowX === 'scroll' || style.textOverflow === 'ellipsis') return false
          return element.getClientRects().length > 0
        }).map(element => {
          const rect = element.getBoundingClientRect()
          return { tag: element.tagName.toLowerCase(), className: element.className, text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 140), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, x: Math.round(rect.x), y: Math.round(rect.y + scrollY), width: Math.round(rect.width), height: Math.round(rect.height) }
        }))
        if (result.clippedText.length) result.failures.push(`text exceeds its content box: ${JSON.stringify(result.clippedText.slice(0, 5))}`)
        result.heading = headings[0].trim()
        result.images = await page.locator('img').count()
      } catch (error) { result.failures.push(error.message) }
      if (result.failures.length) {
        const stem = `${width}x${height}-${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}`
        result.screenshot = `/tmp/hult-site-audit/${stem}.png`
        if (result.clippedText?.length) await page.evaluate(y => scrollTo({ top: Math.max(0, y - 90), behavior: 'instant' }), result.clippedText[0].y)
        await page.screenshot({ path: result.screenshot })
      }
      results.push(result)
      console.log(`${result.failures.length ? 'FAIL' : 'PASS'} ${width}x${height} ${path}${result.failures.length ? `: ${result.failures.join('; ')}` : ''}`)
    }
    await context.close()
  }
  writeFileSync('/tmp/hult-site-audit.json', JSON.stringify({ results, errors }, null, 2))
  const failed = results.filter(result => result.failures.length)
  assert.deepEqual(errors, [], 'browser runtime errors')
  assert.equal(failed.length, 0, `${failed.length} rendering checks failed; see /tmp/hult-site-audit.json`)
  console.log(`Site checks passed: ${paths.length} routes × ${viewports.length} real viewport sizes (${results.length} rendered-page checks).`)
} finally { await browser.close() }
