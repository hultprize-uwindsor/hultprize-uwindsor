import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', '..', 'shots')

const targets = [
  { name: 'mobile-home', url: 'http://localhost:5173/', width: 390, height: 844 },
  { name: 'mobile-team', url: 'http://localhost:5173/team', width: 390, height: 844 },
  { name: 'desktop-home', url: 'http://localhost:5173/', width: 1440, height: 900 },
  { name: 'desktop-team', url: 'http://localhost:5173/team', width: 1440, height: 900 },
]

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.width, height: t.height } })
  await page.goto(t.url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(outDir, `${t.name}.png`), fullPage: true })
  await page.close()
}
await browser.close()
console.log('done')
