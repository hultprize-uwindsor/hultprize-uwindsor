// Run manually after changing a scene in scripts/email-art or the raffle tickets. The GIFs and PNG are committed
// assets that the attendance follow-up emails (google-apps-script/Attendance.gs) load from the live site: the thank-you
// card (thank-you-card.gif), the missed-you letter (missed-you-letter.gif) and the raffle tickets.
// Needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformWithOxc } from 'vite'

const OUT = 'public/images/email'
// Each scene and how long it plays, in ms: the card opens in 3.6s, and the letter has settled open by 3.75s. Each GIF
// plays once and rests on its last frame. 1x, 12fps and no dithering keep each under 1 MB: noise is what a GIF can't
// compress, and the email shows it at most 560px wide.
const SCENES = [['thank-you-card', 3600], ['missed-you-letter', 3750]], FPS = 12, SCALE = 1
// Same wording as the Ticket Jar post's picture in src/data/blog.ts.
const TICKETS = { game: 'The Ticket Jar', prize: '$200', draw: 'Drawn Feb 4, 2027' }

const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const frames = await mkdtemp(join(tmpdir(), 'email-art-'))
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
try {
  await mkdir(OUT, { recursive: true })

  for (const [name, length] of SCENES) {
    // Hold every animation still and step its clock, so each frame lands exactly where the timeline says.
    const page = await browser.newPage({ viewport: { width: 600, height: 420 }, deviceScaleFactor: SCALE })
    await page.goto(pathToFileURL(`scripts/email-art/${name}.html`).href)
    await page.evaluate(() => document.fonts.ready)
    const count = length * FPS / 1000
    for (let frame = 0; frame <= count; frame++) {
      await page.evaluate(time => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = time }), frame * 1000 / FPS)
      await page.screenshot({ path: join(frames, `${name}-${String(frame).padStart(3, '0')}.png`) })
    }
    await page.close()
    // One palette for the whole run, and only the changed rectangle re-encoded per frame, so still areas don't shimmer.
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, `${name}-%03d.png`),
      '-vf', 'split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
      '-loop', '-1', `${OUT}/${name}.gif`])
  }

  // The blog's raffle tickets, rendered from the real component onto a transparent background.
  const source = (await readFile('src/components/RaffleTickets.tsx', 'utf8')).replace("import './RaffleTickets.css'\n", '')
  const { code } = await transformWithOxc(source, 'RaffleTickets.tsx', { jsx: { runtime: 'automatic' } })
  const compiled = 'scripts/email-art/.raffle-tickets.mjs'
  await writeFile(compiled, code)
  let markup
  try { markup = renderToStaticMarkup(createElement((await import(pathToFileURL(compiled).href)).default, TICKETS)) } finally { await rm(compiled) }
  const css = await readFile('src/components/RaffleTickets.css', 'utf8')
  const font = async file => (await readFile(`public/fonts/${file}`)).toString('base64')
  const tickets = await browser.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1.5 })
  await tickets.setContent(`<!doctype html><style>
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${await font('inter-variable.woff2')}) format('woff2'); font-weight: 100 900; }
    @font-face { font-family: 'Special Elite'; src: url(data:font/woff2;base64,${await font('special-elite.woff2')}) format('woff2'); }
    :root { --font-sans: Inter, Arial, sans-serif; --font-type: 'Special Elite', monospace; }
    html, body { margin: 0; background: transparent; } .post-art { position: relative; display: block; width: 400px; height: 300px; }
    ${css}</style>${markup}`)
  await tickets.evaluate(() => document.fonts.ready)
  // Cropped to the tickets, with room for their shadows, rather than the blog picture's whole 400 × 300 box.
  const clip = await tickets.evaluate(() => {
    const boxes = [...document.querySelectorAll('.post-art svg > g')].map(group => group.getBoundingClientRect())
    const left = Math.max(0, Math.min(...boxes.map(box => box.left)) - 10), top = Math.max(0, Math.min(...boxes.map(box => box.top)) - 8)
    return { x: left, y: top, width: Math.min(400, Math.max(...boxes.map(box => box.right)) + 10) - left, height: Math.min(300, Math.max(...boxes.map(box => box.bottom)) + 16) - top }
  })
  await tickets.screenshot({ path: `${OUT}/raffle-tickets.png`, clip, omitBackground: true })

  for (const file of [...SCENES.map(([name]) => `${name}.gif`), 'raffle-tickets.png']) console.log(`${OUT}/${file}: ${Math.round((await stat(`${OUT}/${file}`)).size / 1024)} KB`)
} finally {
  await browser.close()
  await rm(frames, { recursive: true, force: true })
}
