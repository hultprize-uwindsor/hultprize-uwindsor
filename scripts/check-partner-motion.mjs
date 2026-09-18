import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {})
async function transform(track) { return track.evaluate(el => getComputedStyle(el).transform) }
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' })
 page.setDefaultTimeout(10000)
 const errors = []
 page.on('pageerror', e => errors.push(e.message))
 await page.goto(`${base}/year-one`, { waitUntil: 'domcontentloaded' })
 const showcase = page.locator('.partner-strip')
 const row = showcase.locator('.three-d-row')
 const track = row.locator('.three-d-track')
 await row.scrollIntoViewIfNeeded()
 await page.mouse.move(0,0)
 await page.waitForTimeout(200)
 const first = await transform(track)
 await page.waitForTimeout(180)
 assert.notEqual(await transform(track), first, 'Visible rows should cruise')
 await row.hover()
 const hovered = await transform(track)
 await page.waitForTimeout(180)
 assert.equal(await transform(track), hovered, 'Hover should pause motion')
 await page.mouse.move(0,0)
 assert.equal(await page.getByRole('button', { name: /(?:Pause|Play) partner/ }).count(), 0)
 const originalLink = row.locator('.three-d-block:not([data-clone]) a').first()
 await originalLink.focus()
 assert.equal(await transform(track), 'none', 'Keyboard focus should expose a stationary list')
 assert.equal(await row.locator('[data-clone]').first().evaluate(el => getComputedStyle(el).display), 'none')
 await page.locator('h1').click()
 await row.scrollIntoViewIfNeeded()
 await page.mouse.move(0,0)
 assert(await row.locator('[data-clone] a').evaluateAll(links => links.every(a => a.tabIndex === -1)))
 assert.equal(await row.locator('.three-d-block:not([data-clone]) a').count(), 12)
 assert.equal(await originalLink.getAttribute('href'), 'https://www.wetech-alliance.com/')
 // Sustained upward scrolling should reverse the supplied velocity-driven tilt.
 let reversed = false
 for (let i=0;i<14;i++) {
  await page.evaluate(() => window.scrollBy(0,-12))
  await page.waitForTimeout(20)
  const skew = await track.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).m21)
  if (skew > .001) reversed = true
 }
 assert(reversed, 'Upward scroll should reverse direction and tilt')
 await page.locator('h1').scrollIntoViewIfNeeded()
 await page.waitForTimeout(150)
 const offscreen = await transform(track)
 await page.waitForTimeout(180)
 assert.equal(await transform(track), offscreen, 'Offscreen rows should stop')
 await page.emulateMedia({ reducedMotion: 'reduce' })
 await row.scrollIntoViewIfNeeded()
 assert.equal(await transform(track), 'none')
 assert.equal(await showcase.locator('.strip-pause').isVisible(), false)
 console.log('Desktop: cruising, hover/focus pause, accessible clones, reversal, offscreen suspension and reduced motion passed')
 await page.close()
 for (const path of ['/', '/year-one', '/partners']) {
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' })
  await mobile.goto(base+path, { waitUntil: 'domcontentloaded' })
  assert.equal(await mobile.locator('.partner-strip .three-d-row').count(), 1)
  assert.equal(await mobile.locator('.partner-strip .three-d-block:not([data-clone]) a').count(), 12)
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  assert.equal(await mobile.locator('.partner-strip .three-d-track').evaluate(el => getComputedStyle(el).transform), 'none')
  await mobile.close()
 }
 assert.deepEqual(errors, [])
 console.log('Mobile: Home, Year One, and Partners strips, links and overflow passed')
} finally { await browser.close() }
