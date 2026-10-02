// Run manually after changing page titles or branding. Generated PNGs are committed assets;
// the production build does not need a browser or network access.
import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'
import { PAGE_METADATA } from '../src/data/pageMeta.ts'

const logo = await readFile('public/images/logos/hult-uwindsor-navbar-white.png')
const font = await readFile('public/fonts/inter-variable.woff2')
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await mkdir('public/images/social', { recursive: true })
  for (const meta of PAGE_METADATA) {
    const heading = meta.path === '/' ? 'One idea.<br>4 minutes.<br>US$1,000,000.' : escape(meta.title)
    await page.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:Inter;src:url(data:font/woff2;base64,${font.toString('base64')}) format('woff2');font-weight:100 900}
      *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{position:relative;padding:50px 58px;background:#002b51;color:white;font-family:Inter,Arial,sans-serif}
      header{display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}header img{width:300px;height:auto}.badge{border:1px solid #ffffff70;border-radius:30px;padding:10px 18px;font-size:15px;letter-spacing:.01em}
      main{position:absolute;z-index:1;left:58px;right:240px;top:178px;bottom:62px;display:flex;justify-content:center;flex-direction:column;gap:26px}h1{margin:0;font-size:${meta.title.length > 36 ? '76' : '88'}px;font-weight:450;letter-spacing:-.065em;line-height:1.02}p{font-size:20px;line-height:1.5;margin:0;color:#dfecf6;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;max-width:840px}.home p{display:none}
      .rings{position:absolute;width:510px;height:510px;border:67px solid #ff329b;border-radius:50%;right:-270px;top:158px;transform:rotate(-30deg) scaleX(.75);box-shadow:-33px 32px 0 #bb0964,-66px 64px 0 #821950,-99px 96px 0 #583552;opacity:.9}.arrow{position:absolute;right:60px;bottom:50px;font-size:50px;color:#ff87c8}.url{position:absolute;bottom:35px;left:60px;font-size:14px;color:#bbcedd}
    </style></head><body class="${meta.path === '/' ? 'home' : ''}"><div class="rings"></div><header><img src="data:image/png;base64,${logo.toString('base64')}" alt=""><span class="badge">Student ideas. Global impact.</span></header><main><h1>${heading}</h1><p>${escape(meta.description)}</p></main><span class="url">hultprizeuwindsor.ca</span><span class="arrow">↗</span></body></html>`)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `public${meta.image}`, type: 'png' })
  }
  console.log(`Generated ${PAGE_METADATA.length} branded social cards.`)
} finally { await browser.close() }
