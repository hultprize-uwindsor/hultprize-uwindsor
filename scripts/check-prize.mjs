import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const canvasHash = async canvas => createHash('sha256').update(await canvas.evaluate(element => element.toDataURL())).digest('hex')
async function coinSnapshot(canvas) {
  const result = await canvas.evaluate(element => {
    const { width, height } = element
    const rect = element.getBoundingClientRect()
    const pixels = element.getContext('2d').getImageData(0, 0, width, height).data
    const firstX = Math.max(0, Math.floor(-rect.left * width / rect.width))
    const lastX = Math.min(width, Math.ceil((innerWidth - rect.left) * width / rect.width))
    const firstY = Math.max(0, Math.floor(-rect.top * height / rect.height))
    const lastY = Math.min(height, Math.ceil((innerHeight - rect.top) * height / rect.height))
    let painted = 0, visiblePainted = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 30) {
        painted++
        if (x >= firstX && x < lastX && y >= firstY && y < lastY) visiblePainted++
      }
    }
    return { painted, visiblePainted, state: element.dataset.coinState, run: Number(element.dataset.coinRun), url: element.toDataURL() }
  })
  const { url, ...values } = result
  return { ...values, hash: createHash('sha256').update(url).digest('hex') }
}

async function positionPrizeHeading(page, viewportFraction) {
  await page.waitForFunction(() => !document.documentElement.classList.contains('lenis-scrolling'))
  await page.evaluate(fraction => {
    const heading = document.getElementById('global-prize-title')
    scrollTo({ top: scrollY + heading.getBoundingClientRect().top - innerHeight * fraction, behavior: 'instant' })
  }, viewportFraction)
  await page.waitForTimeout(150)
}

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
const errors = []
const rateRequests = []
mkdirSync('/tmp/hult-prize-check', { recursive: true })
function watchPage(page) {
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (/frankfurter|exchange[-_]?rates?/i.test(request.url())) rateRequests.push(request.url())
  })
}
async function assertPrizeContent(page) {
  const section = page.locator('#global-prize')
  assert.match(await section.locator('#global-prize-title').textContent(), /\$1M\s*USD/, 'prize headline names the fixed USD amount')
  assert(Number(await section.locator('.global-prize__million').evaluate(element => getComputedStyle(element).fontWeight)) >= 700, 'million-dollar headline stays bold')
  assert.equal(await section.locator('select, input, output, [role="combobox"]').count(), 0, 'prize section contains no currency converter or editable amount')
}

try {
  const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const reducedPage = await reducedContext.newPage()
  watchPage(reducedPage)
  await reducedPage.goto(base)
  await reducedPage.locator('#global-prize').scrollIntoViewIfNeeded()
  await assertPrizeContent(reducedPage)
  const stillCanvas = reducedPage.locator('#global-prize canvas.prize-coins')
  await reducedPage.waitForFunction(() => document.querySelector('#global-prize canvas')?.dataset.coinState === 'still')
  const initialStill = await coinSnapshot(stillCanvas)
  assert(initialStill.painted > 100, 'reduced-motion page load retains static coins')
  await reducedPage.waitForTimeout(300)
  assert.equal(await canvasHash(stillCanvas), initialStill.hash, 'reduced-motion page load remains still')
  await reducedPage.locator('#global-prize').screenshot({ path: '/tmp/hult-prize-check/desktop.png' })
  await reducedContext.close()

  for (const width of [1440, 375, 320]) {
    const animated = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 850 }, isMobile: width < 700, hasTouch: width < 700, reducedMotion: 'no-preference' })
    const animatedPage = await animated.newPage()
    watchPage(animatedPage)
    await animatedPage.goto(base)
    await animatedPage.evaluate(() => document.fonts.ready)
    await assertPrizeContent(animatedPage)
    const canvas = animatedPage.locator('#global-prize canvas.prize-coins')
    await canvas.waitFor({ state: 'attached' })
    await positionPrizeHeading(animatedPage, .82)
    const waiting = await coinSnapshot(canvas)
    assert.equal(waiting.state, 'waiting', `${width}px: coin shower waits before the heading enters its trigger area`)
    assert.equal(waiting.run, 0, `${width}px: shower has not started offscreen`)
    assert.equal(waiting.painted, 0, `${width}px: no coins are painted before heading entry`)
    await animatedPage.screenshot({ path: `/tmp/hult-prize-check/coins-${width}-before.png` })
    await positionPrizeHeading(animatedPage, .65)
    await animatedPage.waitForFunction(() => document.querySelector('#global-prize canvas')?.dataset.coinState === 'falling')
    await animatedPage.waitForTimeout(600)
    let falling = await coinSnapshot(canvas)
    for (let attempt = 0; !falling.visiblePainted && attempt < 6; attempt++) {
      await animatedPage.waitForTimeout(250)
      falling = await coinSnapshot(canvas)
    }
    assert(falling.visiblePainted > 100, `${width}px: falling coins actually paint inside the current viewport`)
    assert.equal(falling.run, 1, `${width}px: heading entry starts one shower`)
    await animatedPage.waitForTimeout(250)
    assert.notEqual(await canvasHash(canvas), falling.hash, `${width}px: rendered coin pixels change between animation frames`)
    await animatedPage.screenshot({ path: `/tmp/hult-prize-check/coins-${width}-falling.png` })
    await animatedPage.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await animatedPage.waitForTimeout(200)
    const offscreen = await canvasHash(canvas)
    await animatedPage.waitForTimeout(350)
    assert.equal(await canvasHash(canvas), offscreen, `${width}px: offscreen coin canvas stops changing`)
    await positionPrizeHeading(animatedPage, .65)
    await animatedPage.waitForFunction(previous => Number(document.querySelector('#global-prize canvas')?.dataset.coinRun) > previous, falling.run)
    await animatedPage.waitForTimeout(650)
    const replay = await coinSnapshot(canvas)
    await animatedPage.waitForTimeout(220)
    assert.notEqual(await canvasHash(canvas), replay.hash, `${width}px: returning to the section replays moving coins`)
    assert(await animatedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: the coin section has no horizontal overflow`)

    if (width === 1440) {
      // Show the floor so a settled coin can be picked up with a mouse.
      await animatedPage.evaluate(() => {
        const rect = document.getElementById('global-prize').getBoundingClientRect()
        scrollTo({ top: scrollY + rect.bottom - innerHeight + 30, behavior: 'instant' })
      })
      await animatedPage.waitForFunction(() => document.querySelector('#global-prize canvas')?.dataset.coinState === 'settled', null, { timeout: 16_000 })
      const point = await canvas.evaluate(element => {
        const { width, height } = element
        const data = element.getContext('2d').getImageData(0, 0, width, height).data
        const rect = element.getBoundingClientRect()
        const firstY = Math.max(20, Math.ceil(-rect.top * height / rect.height))
        const lastY = Math.min(height - 20, Math.floor((innerHeight - rect.top) * height / rect.height))
        for (let y = firstY; y < lastY; y += 7) for (let x = 30; x < width - 30; x += 7) {
          const solid = [-12, 0, 12].every(dy => [-12, 0, 12].every(dx => data[((y + dy) * width + x + dx) * 4 + 3] > 250))
          if (solid) return { x: rect.left + x * rect.width / width, y: rect.top + y * rect.height / height }
        }
        return null
      })
      assert(point, 'settled desktop coins provide a visible interior hit target')
      await animatedPage.mouse.move(point.x, point.y)
      await animatedPage.mouse.down()
      assert.equal(await canvas.evaluate(element => element.style.cursor), 'grabbing', 'a desktop coin can be picked up')
      await animatedPage.mouse.move(point.x + 90, point.y - 90, { steps: 8 })
      await animatedPage.mouse.up()
      assert.equal(await canvas.evaluate(element => element.style.cursor), 'auto', 'a dragged coin releases')
      await animatedPage.screenshot({ path: '/tmp/hult-prize-check/coins-desktop-drag.png' })
    }

    await animatedPage.emulateMedia({ reducedMotion: 'reduce' })
    await animatedPage.waitForFunction(() => document.querySelector('#global-prize canvas')?.dataset.coinState === 'still')
    const reduced = await coinSnapshot(canvas)
    assert(reduced.painted > 100, `${width}px: reduced motion retains a visible static coin arrangement`)
    await animatedPage.waitForTimeout(250)
    assert.equal(await canvasHash(canvas), reduced.hash, `${width}px: reduced motion freezes rendered coin pixels`)
    await animatedPage.emulateMedia({ reducedMotion: 'no-preference' })
    await positionPrizeHeading(animatedPage, .65)
    await animatedPage.waitForFunction(previous => {
      const surface = document.querySelector('#global-prize canvas')
      return surface?.dataset.coinState === 'falling' && Number(surface.dataset.coinRun) > previous
    }, reduced.run)
    await animated.close()
    console.log(`PASS ${width}px coins: heading entry, painted motion, offscreen pause, replay, reduced motion and overflow`)
  }

  assert.deepEqual(errors, [], 'no browser runtime errors')
  assert.deepEqual(rateRequests, [], 'prize section makes no exchange-rate requests')
  console.log('Prize checks passed: fixed bold USD prize, no converter or exchange-rate requests, desktop/mobile coin entry, painted-frame motion, offscreen pause, replay, reduced motion, desktop dragging and overflow.')
} finally {
  await browser.close()
}
