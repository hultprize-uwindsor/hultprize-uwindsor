import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
const errors = []
const visible = locator => locator.evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width > 0).length)
// The tagline is written under the title, on the title's side of the hero.
const taglineUnderTitle = page => page.evaluate(() => {
  const box = selector => document.querySelector(selector).getBoundingClientRect()
  const [title, tagline, board] = [box('.home-hero h1'), box('.home-hero__tagline'), box('.home-hero .cork-board')]
  const besideBoard = board.left >= title.right - 1
  return tagline.top >= title.bottom - 1 && tagline.left < title.left + 40 && (!besideBoard || tagline.right <= board.left + 1) && (besideBoard || tagline.bottom <= board.top + 1)
})
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => errors.push(error.message))
  // The homepage's "Up next" event reads the attendance API; keep the check offline.
  await page.route('**/api/attendance*', route => route.fulfill({ json: { ok: false, code: 'unavailable' } }))
  await page.goto(base, { waitUntil: 'networkidle' })
  const photos = page.locator('.home-hero .pinned')
  const count = await photos.count()
  assert(count >= 6, `at least the six cleared photos are pinned (${count})`)
  await page.waitForFunction(() => [...document.querySelectorAll('.home-hero .pinned img')].every(image => image.complete && image.naturalWidth > 0))
  await page.waitForTimeout(2800)
  assert.equal(await photos.evaluateAll(elements => elements.filter(element => getComputedStyle(element).opacity !== '1').length), 0, 'every photo finishes its entrance')
  const delays = await photos.evaluateAll(elements => elements.map(element => parseFloat(getComputedStyle(element).animationDelay)))
  assert.equal(new Set(delays).size, delays.length, 'each photo has its own entrance moment')
  assert(delays.some((delay, index) => index > 0 && delay < delays[index - 1]), 'photos arrive in a shuffled order, not row by row')
  assert.equal(await visible(page.locator('.home-hero .pinned .pin')), count, 'every photo hangs from a pushpin')
  const [title, board] = [await page.locator('.home-hero h1').boundingBox(), await page.locator('.home-hero .cork-board').boundingBox()]
  assert(title.x + title.width <= board.x, 'the title sits left of the board on desktop')
  assert(await taglineUnderTitle(page), 'the tagline is written under the title, beside the board')
  assert(await page.locator('.home-hero .pinned__sway').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationPlayState === 'running')), 'visible photos sway')
  const swinging = photo => photo.locator('.pinned__photo').evaluate(element => element.getAnimations().some(animation => animation.id === 'pin-swing' && animation.playState === 'running'))
  await photos.first().hover()
  await page.waitForTimeout(250)
  assert.equal(await photos.first().evaluate(element => getComputedStyle(element).zIndex), '70', 'a hovered photo rises above the board')
  assert(await swinging(photos.first()), 'a hovered photo swings on its pin')
  assert.notEqual(await photos.first().locator('.pinned__photo').evaluate(element => getComputedStyle(element).rotate), 'none', 'the swing tilts the photo side to side')
  await page.waitForFunction(() => !document.querySelector('.pinned__photo')?.getAnimations().some(animation => animation.id === 'pin-swing'), null, { timeout: 2500 })
  assert.equal(await photos.first().locator('.pinned__photo').evaluate(element => getComputedStyle(element).rotate), 'none', 'the swing settles back to straight')
  await page.evaluate(() => window.scrollTo(0, 3000))
  await page.waitForTimeout(400)
  assert(await page.locator('.home-hero .cork-board').evaluate(element => element.classList.contains('is-offscreen')), 'offscreen board is marked')
  assert.equal(await page.locator('.home-hero .pinned__sway').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused', 'offscreen board pauses its sway')
  // Move the pointer off the board first: scrolling back with it over a photo would start a swing (motion is still on)
  // before reduced motion is switched on below.
  await page.mouse.move(5, 5)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(300)
  assert(await page.locator('.home-hero .pinned, .home-hero .pinned__sway').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationName === 'none')), 'reduced motion shows a still board')
  await page.mouse.move(5, 5)
  await photos.first().hover()
  await page.waitForTimeout(150)
  assert.equal(await swinging(photos.first()), false, 'reduced motion skips the hover swing')
  await mkdir('/tmp/hult-hero-collage', { recursive: true })
  await page.screenshot({ path: '/tmp/hult-hero-collage/desktop.png' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const [width, height, expected] of [[1280, 720, Math.min(count, 30)], [820, 1180, Math.min(count, 18)], [390, 844, Math.min(count, 9)], [320, 812, Math.min(count, 9)]]) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(300)
    assert.equal(await visible(photos), expected, `${width}px pins ${expected} photos`)
    assert(await taglineUnderTitle(page), `${width}px keeps the tagline under the title`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, `${width}px has no horizontal overflow from the board`)
  }
  await page.screenshot({ path: '/tmp/hult-hero-collage/mobile.png' })
  assert.deepEqual(errors, [], 'no browser errors')
  console.log(`Hero cork board passed: ${count} pinned photos, title and tagline beside the board, entrance, hover swing and settle, offscreen pause, reduced motion, short-laptop, tablet and phone layouts.`)
} finally {
  await browser.close()
}
