import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'

const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
const routeTitles = { '/': 'Home', '/about': 'About', '/year-one': 'Year one', '/this-year': 'This year', '/events': 'Events', '/compete': 'Compete', '/partners': 'Partners', '/contact': 'Find us', '/partners/fusion': 'Fusion', '/partners/sterling': 'Sterling Cybersecurity and Advisory Group', '/partners/wetech': 'WEtech Alliance' }
const visit = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.locator('.site-header').waitFor()
}
const report = []
const external = new Set()
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('https://maps.google.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Map</html>' }))
    for (const region of ['navbar', 'footer']) {
      await visit(page, base)
      const selector = region === 'footer' ? '.site-footer' : width <= 1180 ? '.mobile-navigation' : '.site-header'
      const links = await page.locator(`${selector} a`).evaluateAll(links => links.map(a => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, label: a.textContent.trim() || a.getAttribute('aria-label') })))
      for (const { href, target, rel, label } of links) {
        assert(href && href !== '#', `empty link: ${label}`)
        if (href.startsWith('https://')) {
          new URL(href)
          assert.equal(target, '_blank', label)
          assert(rel.includes('noopener'), label)
          external.add(href)
          await visit(page, base)
          if (region === 'navbar' && width <= 1180) await page.getByRole('button', { name: 'Menu', exact: true }).click()
          // Intercept only the destination document: test real new-tab behavior without logging in or joining a group.
          const destination = href.split('#')[0]
          const match = url => url.href.split('#')[0] === destination
          await page.context().route(match, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html><title>Link target</title></html>' }))
          const opened = page.context().waitForEvent('page')
          const externalLink = page.locator(`${selector} a[href=${JSON.stringify(href)}]`).first()
          const externalGroup = externalLink.locator('xpath=ancestor::details')
          if (await externalGroup.count() && !await externalGroup.evaluate(e => e.open)) await externalGroup.locator('summary').click()
          await externalLink.click()
          const popup = await opened
          await popup.waitForURL(href)
          assert.equal(await popup.evaluate(() => window.opener), null, 'external tab has no opener')
          await popup.close()
          await page.context().unroute(match)
          report.push({ width, region, label, href, status: 'clicked; exact new-tab target verified; live availability checked separately' })
          continue
        }
        if (href.startsWith('mailto:')) {
          assert.match(href, /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/)
          report.push({ width, region, label, href, status: 'email target valid; no email sent' })
          continue
        }
        assert(href.startsWith('/'), href)
        await visit(page, base)
        if (region === 'navbar' && width <= 1180) await page.getByRole('button', { name: 'Menu', exact: true }).click()
        const link = page.locator(`${selector} a[href=${JSON.stringify(href)}]`).first()
        // Open desktop dropdowns and mobile footer accordions before activating links.
        const menu = link.locator('xpath=ancestor::details')
        if (await menu.count() && !await menu.evaluate(e => e.open)) await menu.locator('summary').click()
        await link.click()
        await page.waitForURL(new URL(href, base).href)
        if (region === 'navbar' && width <= 1180) await page.locator('#mobile-navigation').waitFor({ state: 'hidden' })
        await page.waitForFunction(title => document.title.startsWith(`${title} |`), routeTitles[new URL(href, base).pathname])
        await page.locator('main h1').waitFor()
        assert.notEqual(await page.locator('main h1').innerText(), 'Page not found', `${region}: ${href}`)
        if (new URL(href, base).hash) {
          const id = decodeURIComponent(new URL(href, base).hash.slice(1))
          const anchor = page.locator(`[id=${JSON.stringify(id)}]`)
          await anchor.waitFor()
          assert.equal(await anchor.count(), 1, `missing anchor: ${href}`)
          assert(await anchor.evaluate(e => e.getBoundingClientRect().top < innerHeight), `anchor not reached: ${href}`)
        }
        if (width <= 1180) assert.equal(await page.locator('#mobile-navigation').evaluate(e => e.open), false, 'menu closes after navigation')
        report.push({ width, region, label, href, status: 'clicked and destination verified' })
      }
    }
    console.log(`${width}px: navbar and footer links checked.`)
    // New page links, partner next steps, and legacy redirects must resolve too.
    for (const path of ['/about', '/year-one', '/this-year', '/compete', '/partners', '/contact', '/events', '/events/fusion-launch', '/events/registration-closes-november-20', '/partners/fusion', '/partners/sterling', '/partners/wetech', '/team', '/go']) {
      await visit(page, base + path)
      await page.locator('main h1').waitFor()
      const mainLinks = await page.locator('main a').evaluateAll(as => as.map(a => a.href).filter(href => href.startsWith(location.origin)))
      for (const href of new Set(mainLinks)) {
        const dest = new URL(href)
        if (dest.pathname.startsWith('/images/')) {
          const response = await page.request.get(href)
          assert(response.ok(), `download missing: ${href}`)
          continue
        }
        await visit(page, href)
        await page.locator('main h1').waitFor()
        assert.notEqual(await page.locator('main h1').innerText(), 'Page not found', href)
        if (dest.hash) assert.equal(await page.locator(`[id=${JSON.stringify(decodeURIComponent(dest.hash.slice(1)))}]`).count(), 1, href)
      }
    }
    assert.deepEqual(errors, [])
    await page.close()
  }
  writeFileSync('/tmp/hult-link-audit.json', JSON.stringify({ checkedAt: new Date().toISOString(), links: report, external: [...external] }, null, 2))
  console.log(`Passed: ${report.length} navbar/footer link checks across desktop and mobile; clicked all internal destinations; checked page anchors, downloads and redirects. ${external.size} unique external destinations recorded.`)
} finally { await browser.close() }
