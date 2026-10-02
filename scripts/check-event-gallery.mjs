import assert from 'node:assert/strict'
import { access, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const buildDir = resolve(process.env.CHECK_BUILD_DIR || 'dist')
const permissions = JSON.parse(await readFile(new URL('../src/data/photo-permissions.json', import.meta.url), 'utf8'))
const approvedFiles = permissions.homeGalleryFiles
const screenshots = '/tmp/hult-event-gallery'
const errors = []
const failedImages = []
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  // The brand-motion suite separately exercises WebGL. Keep gallery timing and
  // native input checks independent of software-rendered shader performance.
  args: ['--disable-webgl'],
})

function watch(page) {
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.url().includes('/images/year-one/') && !response.ok()) failedImages.push(`${response.status()} ${response.url()}`)
  })
}

async function activeSlide(page) {
  return page.locator('.event-phone__slide.is-active').getAttribute('aria-label')
}

async function waitForSlide(page, expected) {
  await page.waitForFunction(label => document.querySelector('.event-phone__slide.is-active')?.getAttribute('aria-label') === label, expected)
}

async function openGallery(page) {
  watch(page)
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const gallery = page.getByRole('region', { name: 'Past events at UWindsor' })
  await gallery.scrollIntoViewIfNeeded()
  await page.locator('.event-phone__slide img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  return gallery
}

async function assertPhotoContent(page) {
  const photos = await page.locator('.event-phone__slide').evaluateAll(slides => slides.map(slide => {
    const image = slide.querySelector('img')
    return {
      source: new URL(image.src).pathname.split('/').at(-1),
      alt: image.alt,
      width: image.naturalWidth,
      height: image.naturalHeight,
      hidden: slide.getAttribute('aria-hidden'),
    }
  }))
  assert.deepEqual(photos.map(photo => photo.source), approvedFiles, 'gallery uses the explicitly selected event photos')
  assert(photos.every(photo => photo.width > 100 && photo.height > 100 && photo.alt.length > 20), 'every photo loads and has a descriptive alternative')
  assert.equal(photos.filter(photo => photo.hidden === 'false').length, 1, 'only the active slide is exposed to assistive technology')
  const caption = await page.locator('.event-phone__caption p').textContent()
  assert(caption.trim().length > 10, 'the displayed photo has a useful caption')
  assert(!/February|2026|2027/.test(caption), 'gallery captions do not introduce an unconfirmed event date')
}

async function swipe(page, direction, vertical = false) {
  const phone = page.locator('.event-phone')
  await phone.scrollIntoViewIfNeeded()
  const box = await phone.boundingBox()
  const viewport = page.viewportSize()
  const x = box.x + box.width * (vertical ? .5 : direction > 0 ? .78 : .22)
  const y = Math.min(viewport.height - 130, Math.max(150, box.y + box.height * .43))
  const distance = Math.min(140, box.width * .55)
  const startScroll = await page.evaluate(() => scrollY)
  const session = await page.context().newCDPSession(page)
  const point = (clientX, clientY) => [{ x: clientX, y: clientY, radiusX: 5, radiusY: 5, force: 1, id: 1 }]
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(x, y) })
    for (let step = 1; step <= 8; step++) {
      const offset = distance * step / 8
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(vertical ? x : x - direction * offset, vertical ? y - offset : y) })
      await page.waitForTimeout(24)
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(180)
    return { startScroll, endScroll: await page.evaluate(() => scrollY) }
  } finally {
    await session.detach()
  }
}

try {
  await mkdir(screenshots, { recursive: true })
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' })
  const page = await desktop.newPage()
  const gallery = await openGallery(page)
  await assertPhotoContent(page)
  const initial = await activeSlide(page)
  const initialCaption = await page.locator('.event-phone__caption p').textContent()
  await page.waitForFunction(label => document.querySelector('.event-phone__slide.is-active')?.getAttribute('aria-label') !== label, initial, { timeout: 12_000 })
  assert.notEqual(await page.locator('.event-phone__caption p').textContent(), initialCaption, 'autoplay changes the displayed photo and its caption')

  await gallery.getByRole('button', { name: 'Pause event gallery', exact: true }).click()
  const pausedSlide = await activeSlide(page)
  await page.waitForTimeout(5500)
  assert.equal(await activeSlide(page), pausedSlide, 'pause keeps the same photo beyond a complete slide interval')
  assert.equal(await gallery.getByRole('button', { name: 'Play event gallery', exact: true }).getAttribute('aria-pressed'), 'true', 'pause state is exposed on the unified control')

  await gallery.getByRole('button', { name: 'Next event photo', exact: true }).click()
  const nextNumber = Number(pausedSlide.split(' ')[0]) % approvedFiles.length + 1
  await waitForSlide(page, `${nextNumber} of ${approvedFiles.length}`)
  await gallery.getByRole('button', { name: 'Previous event photo', exact: true }).click()
  await waitForSlide(page, pausedSlide)
  await page.keyboard.press('ArrowRight')
  await waitForSlide(page, `${nextNumber} of ${approvedFiles.length}`)
  await page.keyboard.press('ArrowLeft')
  await waitForSlide(page, pausedSlide)
  for (let index = 0; index < approvedFiles.length; index++) await gallery.getByRole('button', { name: 'Next event photo', exact: true }).click()
  await waitForSlide(page, pausedSlide)
  assert.equal(await page.locator('.event-phone__caption').getAttribute('aria-live'), 'polite', 'manual navigation announces the updated caption')
  await page.screenshot({ path: `${screenshots}/desktop-paused.png` })

  await gallery.getByRole('button', { name: 'Play event gallery', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.event-showcase')?.classList.contains('is-playing'))
  await page.waitForTimeout(250)
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForFunction(() => !document.querySelector('.event-showcase')?.classList.contains('is-playing'))
  const offscreenSlide = await activeSlide(page)
  const offscreenProgress = await page.locator('.event-showcase').evaluate(section => section.style.getPropertyValue('--gallery-progress'))
  await page.waitForTimeout(5500)
  assert.equal(await activeSlide(page), offscreenSlide, 'offscreen gallery does not advance')
  assert.equal(await page.locator('.event-showcase').evaluate(section => section.style.getPropertyValue('--gallery-progress')), offscreenProgress, 'offscreen progress remains frozen')
  await gallery.scrollIntoViewIfNeeded()
  await page.waitForFunction(label => document.querySelector('.event-phone__slide.is-active')?.getAttribute('aria-label') !== label, offscreenSlide, { timeout: 12_000 })
  await gallery.getByRole('button', { name: 'Next event photo', exact: true }).focus()
  await page.waitForFunction(() => !document.querySelector('.event-showcase')?.classList.contains('is-playing'))
  assert.equal(await gallery.getByRole('button', { name: 'Play event gallery', exact: true }).getAttribute('aria-pressed'), 'true', 'keyboard focus pauses the moving phone and photo progression')
  await page.keyboard.press('Enter')
  await assertPhotoContent(page)
  await gallery.getByRole('button', { name: 'Play event gallery', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.event-showcase')?.classList.contains('is-playing'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForFunction(() => !document.querySelector('.event-showcase')?.classList.contains('is-playing'))
  assert.equal(await gallery.getByRole('button', { name: /^(Pause|Play) event gallery$/ }).count(), 0, 'live reduced motion removes the autoplay control')
  const liveReducedSlide = await activeSlide(page)
  await page.waitForTimeout(5500)
  assert.equal(await activeSlide(page), liveReducedSlide, 'live reduced motion stops autoplay')
  await desktop.close()
  console.log('PASS desktop gallery: auto progression, pause, manual wraparound, keyboard, offscreen suspension, resume and live reduced motion')

  for (const width of [375, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    const mobile = await context.newPage()
    const mobileGallery = await openGallery(mobile)
    await assertPhotoContent(mobile)
    const start = await activeSlide(mobile)
    assert.equal(await mobileGallery.getByRole('button', { name: /^(Pause|Play) event gallery$/ }).count(), 0, `${width}px: initial reduced motion has no autoplay control`)
    const imageMotion = await mobile.locator('.event-phone__slide.is-active img').evaluate(image => getComputedStyle(image).animationName)
    assert.equal(imageMotion, 'none', `${width}px: reduced motion keeps the photograph still`)
    if (width === 375) {
      await mobile.waitForTimeout(5500)
      assert.equal(await activeSlide(mobile), start, 'initial reduced motion never advances on its own')
    }
    await swipe(mobile, 1)
    await waitForSlide(mobile, `2 of ${approvedFiles.length}`)
    await swipe(mobile, -1)
    await waitForSlide(mobile, start)
    const vertical = await swipe(mobile, 1, true)
    assert(vertical.endScroll > vertical.startScroll + 30, `${width}px: a vertical gesture on the phone still scrolls the page`)
    assert.equal(await activeSlide(mobile), start, `${width}px: vertical scrolling does not change slides`)
    await mobileGallery.getByRole('button', { name: 'Next event photo', exact: true }).click()
    await waitForSlide(mobile, `2 of ${approvedFiles.length}`)
    await mobile.keyboard.press('ArrowLeft')
    await waitForSlide(mobile, start)
    assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: gallery has no horizontal overflow`)
    const phoneBox = await mobile.locator('.event-phone').boundingBox()
    assert(phoneBox.x >= 0 && phoneBox.x + phoneBox.width <= width, `${width}px: phone stays within the viewport`)
    for (const button of await mobileGallery.getByRole('button').all()) {
      const rect = await button.boundingBox()
      assert(rect.width >= 44 && rect.height >= 44, `${width}px: phone controls retain touch-sized targets`)
    }
    await mobile.locator('.event-showcase').screenshot({ path: `${screenshots}/mobile-${width}.png` })
    await context.close()
    console.log(`PASS ${width}px gallery: loaded photos, reduced motion, horizontal swipe, vertical page scroll, keyboard and touch targets`)
  }

  const outputPhotos = await readdir(resolve(buildDir, 'images/year-one'))
  for (const file of approvedFiles) {
    assert((await stat(resolve(buildDir, 'images/year-one', file))).size > 1000, `production includes the approved photo ${file}`)
  }
  if (!permissions.approvedForPublication) assert.deepEqual(outputPhotos.sort(), [...approvedFiles].sort(), 'production contains only the explicit homepage event-photo allowlist')
  await assert.rejects(access(resolve(buildDir, 'images/local-event-photos-2026')), 'full-resolution source photos remain excluded from production')
  assert.deepEqual(failedImages, [], 'event images load without HTTP errors')
  assert.deepEqual(errors, [], 'no browser runtime errors')
  console.log('PASS production assets: approved gallery images included, other unapproved exports and full-resolution originals excluded')
  console.log(`Event gallery checks passed. Screenshots: ${screenshots}`)
} finally {
  await browser.close()
}
