import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  args: ['--enable-unsafe-swiftshader'],
})
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    window.__heroDraws = 0
    window.__programmeDraws = 0
    const original = WebGLRenderingContext.prototype.drawArrays
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      if (this.canvas.closest('.home-hero')) window.__heroDraws++
      if (this.canvas.closest('.programme-feature')) window.__programmeDraws++
      return original.apply(this, args)
    }
  })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const draws = () => page.evaluate(() => window.__heroDraws)
  assert.equal(await page.locator('.home-hero .brand-scene').getAttribute('data-renderer'), 'webgl', 'dimensional renderer is active')
  const active = await draws()
  await page.waitForTimeout(400)
  assert(await draws() > active, 'visible artwork animates')
  assert.equal(await page.locator('.home-hero .scene-control').count(), 0, 'hero has no pause control')
  await page.evaluate(() => window.scrollTo(0, 2500))
  await page.waitForTimeout(400)
  const offscreen = await draws()
  await page.waitForTimeout(400)
  assert.equal(await draws(), offscreen, 'offscreen artwork stops rendering')
  const programme = page.locator('.programme-feature')
  await programme.scrollIntoViewIfNeeded()
  await programme.getByRole('button', { name: 'Pause background animation' }).click()
  await page.waitForTimeout(200)
  const paused = await page.evaluate(() => window.__programmeDraws)
  await page.waitForTimeout(400)
  assert.equal(await page.evaluate(() => window.__programmeDraws), paused, 'programme pause control freezes its artwork')
  await programme.getByRole('button', { name: 'Play background animation' }).click()
  await page.waitForTimeout(400)
  assert(await page.evaluate(() => window.__programmeDraws) > paused, 'programme play control resumes its artwork')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(400)
  const reduced = await draws()
  await page.waitForTimeout(400)
  assert.equal(await draws(), reduced, 'reduced motion displays a still frame')
  await mkdir('/tmp/hult-brand-motion', { recursive: true })
  await page.screenshot({ path: '/tmp/hult-brand-motion/desktop.png' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 320, height: 812 })
  await page.waitForTimeout(300)
  assert.equal((await page.locator('.home-hero .brand-scene').boundingBox()).width, 320, 'artwork fits the narrow viewport')
  await page.screenshot({ path: '/tmp/hult-brand-motion/mobile.png' })
  await page.locator('.home-hero canvas').evaluate(canvas => canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext())
  await page.waitForTimeout(100)
  assert.equal(await page.locator('.home-hero .brand-scene').getAttribute('data-renderer'), null, 'context loss activates fallback')
  assert.equal(await page.locator('.home-hero .brand-scene__fallback').evaluate(element => getComputedStyle(element).visibility), 'visible', 'static artwork remains available')
  assert.deepEqual(errors, [], 'no browser errors')
  console.log('Brand motion passed: hero animation without pause control, programme pause/resume, offscreen suspension, reduced motion, 320px layout and WebGL fallback.')
} finally {
  await browser.close()
}
