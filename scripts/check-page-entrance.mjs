import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' })
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      const start = document.startViewTransition.bind(document)
      window.transitions = []
      document.startViewTransition = (...args) => {
        const record = { from: document.querySelector('main h1')?.textContent, scroll: scrollY, ready: false, finished: false }
        window.transitions.push(record)
        const transition = start(...args)
        transition.ready.then(() => { record.ready = true }).catch(() => {})
        transition.finished.finally(() => { record.finished = true })
        return transition
      }
    })
    await page.goto(base + '/about')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1100)
    assert.equal(await page.evaluate(() => window.transitions.length), 0, 'initial load has no outgoing page to cover')
    const settled = () => page.waitForFunction(() => window.transitions.every(t => t.finished))
    const navigate = async path => {
      const count = await page.evaluate(() => window.transitions.length)
      await page.locator(`.site-footer a[href="${path}"]`).first().evaluate(a => a.click())
      await page.waitForURL(base + path)
      await page.waitForFunction(n => window.transitions.length > n && window.transitions.at(-1).ready, count)
    }
    await navigate('/contact')
    const layers = await page.evaluate(() => {
      const old = getComputedStyle(document.documentElement, '::view-transition-old(root)')
      const next = getComputedStyle(document.documentElement, '::view-transition-new(root)')
      return { oldAnimation: old.animationName, oldOpacity: old.opacity, oldZ: old.zIndex, newZ: next.zIndex, newAnimation: next.animationName, from: window.transitions.at(-1).from }
    })
    assert.equal(layers.from, 'About', 'snapshot captured before replacing outgoing content')
    assert.equal(layers.oldAnimation, 'none', 'outgoing page stays still')
    assert.equal(layers.oldOpacity, '1', 'outgoing page remains visible')
    assert(Number(layers.newZ) > Number(layers.oldZ), 'incoming page covers outgoing page')
    assert.equal(layers.newAnimation, 'page-slide-over')
    await page.screenshot({ path: `/tmp/page-slide-over-${width}.png` })
    await settled()
    await navigate('/compete#signup')
    await settled()
    const top = await page.locator('#signup').evaluate(e => e.getBoundingClientRect().top)
    assert(Math.abs(top - 28) < 6, `hash target aligns: ${top}`)
    const saved = await page.evaluate(() => scrollY)
    await navigate('/contact')
    assert(Math.abs(await page.evaluate(() => window.transitions.at(-1).scroll) - saved) < 6, 'snapshot preserves outgoing scroll position')
    await settled()
    const beforeBack = await page.evaluate(() => window.transitions.length)
    await page.goBack()
    await page.waitForURL(base + '/compete#signup')
    await page.waitForFunction(n => window.transitions.length > n && window.transitions.at(-1).ready, beforeBack)
    await settled()
    assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 6, 'Back restores deep scroll')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.locator('.site-footer a[href="/contact"]').first().evaluate(a => a.click())
    await page.waitForURL(base + '/contact')
    await settled()
    assert(await page.evaluate(() => document.getAnimations().every(a => a.animationName !== 'page-slide-over')), 'reduced motion skips the slide')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow')
    assert.deepEqual(errors, [])
    console.log(`PASS ${width}px: outgoing snapshot, overlay order, scrolled navigation, anchors, Back and reduced motion`)
    await page.close()
  }
} finally { await browser.close() }
