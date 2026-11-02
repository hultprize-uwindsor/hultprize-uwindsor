// Run manually after changing a scene in scripts/email-art, the raffle tickets, an event lead, a panel speaker or a
// supporter. The GIFs and PNGs are committed assets that the attendance emails (google-apps-script/Attendance.gs) load
// from the live site: the thank-you card (thank-you-card.gif), the missed-you letter (missed-you-letter.gif), each with
// a small file of its first frame, the raffle tickets, a Polaroid of each event lead and panel speaker, and each
// supporter's logo.
// Needs ffmpeg on PATH, or FFMPEG=/path/to/ffmpeg. Name scenes (or raffle-tickets, leads, panel or supporters) to render
// only those, and set OUT=dir to try a variant without touching the committed files.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { transformWithOxc } from 'vite'

const OUT = process.env.OUT || 'public/images/email'
// Each scene says in its own <meta name="length"> how long it takes to settle, and in <meta name="hold"> how long it
// rests before playing again, both in ms. The GIFs loop forever: mail apps never restart a GIF that has stopped, so
// someone opening the email a second time would only see the last frame. 12fps and no dithering keep each small,
// because noise is what a GIF can't compress; 1.5x keeps the writing sharp on phone screens.
const SCENES = ['thank-you-card', 'missed-you-letter'], FPS = 12, SCALE = 1.5
// Same wording as the Ticket Jar post's picture in src/data/blog.ts.
const TICKETS = { game: 'The Ticket Jar', prize: '$200', draw: 'Drawn Feb 4, 2027' }
// Whoever leads an event, and whoever joins them to open it (ATT_EVENT_LEADS in Attendance.gs), with the photos from
// their partner page in src/data/communityPartners.ts. Each Polaroid is captioned with the name people call them.
const PEACHES = { photo: 'public/images/partners/people/sterling-peaches-madarang-cesario.webp', caption: 'Peaches' }
const NEIL = { photo: 'public/images/partners/people/sterling-neil-cesario.webp', caption: 'Neil' }
const LEADS = [{ picture: 'peaches-madarang-cesario.png', people: [PEACHES] }, { picture: 'peaches-and-neil-cesario.png', people: [NEIL, PEACHES] }]
// The Founders Panel's speakers in speaking order (ATT_EVENT_PANELS in Attendance.gs), one Polaroid each. Peaches's photo
// is the partner page's; the others are their headshots from the panel's promotion, cropped to the same 4:5 in
// scripts/email-art/panel. Each is tilted its own way, as on the partner page, and drawn at 0.8 of a lead's size, as the
// email shows them smaller.
const SPEAKER_TILTS = [['-2deg', '-3deg'], ['1.8deg', '2.5deg'], ['-.8deg', '-1.2deg']]
const PANEL = [
  ['tal-czudner', 'Tal'], ['eunice-ajayi', 'Eunice'], ['gregory-odiase', 'Gregory'], ['umar-azhar', 'Umar'],
  ['ameen-fadel', 'Ameen'], ['jordan-goure', 'Jordan'], ['uzair-syed', 'Uzair'], ['peaches-madarang-cesario', 'Peaches'],
].map(([name, caption], i) => ({ picture: `panel-${name}.png`, scale: 0.8, tilt: SPEAKER_TILTS[i % 3], people: [{ photo: caption === PEACHES.caption ? PEACHES.photo : `scripts/email-art/panel/${name}.jpg`, caption }] }))
// Each supporter's logo (ATT_SUPPORTERS in Attendance.gs), in the emails' own size. Most are the website's, from
// public/images/partners. The ones it doesn't have are in scripts/email-art/logos: Grayfel's is its brand wordmark with
// a damaged curve repaired, and the Alumni Association's and UWill Discover's are the chapter's partner brochure's.
// Research and Innovation's logo is the University's own, so it's named underneath. Grayfel's bold letters look bigger
// than their area, so it's drawn smaller.
const SUPPORTERS = [
  { picture: 'supporter-fusion.png', logo: 'public/images/partners/fusion.png' },
  { picture: 'supporter-sterling.png', logo: 'public/images/partners/sterling-cybersecurity-advisory-group.png' },
  { picture: 'supporter-frct.png', logo: 'public/images/partners/frct.png' },
  { picture: 'supporter-wetech.png', logo: 'public/images/partners/wetech-alliance.png' },
  { picture: 'supporter-small-business-centre.png', logo: 'public/images/partners/small-business-entrepreneurship-centre.png' },
  { picture: 'supporter-picsume.png', logo: 'public/images/partners/picsume.png' },
  { picture: 'supporter-grayfel.png', logo: 'scripts/email-art/logos/grayfel.svg', scale: 0.8 },
  { picture: 'supporter-offshoot.png', logo: 'public/images/partners/offshoot-initiative.svg' },
  { picture: 'supporter-uwsa.png', logo: 'public/images/partners/uwsa.png' },
  { picture: 'supporter-gss.png', logo: 'public/images/partners/gss.png' },
  { picture: 'supporter-alumni-association.png', logo: 'scripts/email-art/logos/uwindsor-alumni-association.png' },
  { picture: 'supporter-research-and-innovation.png', logo: 'public/images/partners/uwindsor.png', label: 'Research &amp; Innovation' },
  { picture: 'supporter-uwill-discover.png', logo: 'scripts/email-art/logos/uwill-discover.jpg' },
  { picture: 'supporter-city-of-windsor.png', logo: 'public/images/partners/city-of-windsor.png' },
]
// The size each is shown at in the email: the file is twice that. The logo inside is scaled to about the same area, so a
// wide one and a square one look equally important, without touching the edges.
const TILE = { width: 125, height: 60, area: 3300, maxWidth: 113, maxHeight: 50 }
const dataUrl = async file => `data:image/${{ jpg: 'jpeg', svg: 'svg+xml' }[file.split('.').pop()] ?? file.split('.').pop()};base64,${(await readFile(file)).toString('base64')}`

// A GIF of only the first frame, byte for byte: the file's header and palette, that frame's blocks and the end marker.
// The loop block is left out. The email shows this behind the full GIF, because iPhones and Safari paint this small file
// sooner than a big GIF's first frame. Being the same pixels, it can't flash when the GIF takes over.
function firstFrame(gif) {
  const table = packed => packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0
  const pastBlocks = at => { while (gif[at]) at += gif[at] + 1; return at + 1 }
  const header = 13 + table(gif[10])
  let at = header, start = header
  while (gif[at] !== 0x2c) { if (gif[at + 1] === 0xf9) start = at; at = pastBlocks(at + 2) }
  if (start === header) start = at
  return Buffer.concat([gif.subarray(0, header), gif.subarray(start, pastBlocks(at + 10 + table(gif[at + 9]) + 1)), Buffer.from([0x3b])])
}

const names = process.argv.slice(2), scenes = names.length ? names.filter(name => !['raffle-tickets', 'leads', 'panel', 'supporters'].includes(name)) : SCENES
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
const frames = await mkdtemp(join(tmpdir(), 'email-art-'))
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})
const font = async file => (await readFile(`public/fonts/${file}`)).toString('base64')
const made = []
try {
  await mkdir(OUT, { recursive: true })

  for (const name of scenes) {
    // Hold every animation still and step its clock, so each frame lands exactly where the timeline says. The picture
    // is the scene's own size: 600 wide, as tall as it needs.
    const page = await browser.newPage({ viewport: { width: 600, height: 420 }, deviceScaleFactor: SCALE })
    await page.goto(pathToFileURL(`scripts/email-art/${name}.html`).href)
    await page.evaluate(() => document.fonts.ready)
    const { length, hold, width, height } = await page.evaluate(() => {
      const meta = key => Number(document.querySelector(`meta[name="${key}"]`)?.content), box = document.querySelector('.scene').getBoundingClientRect()
      return { length: meta('length'), hold: meta('hold'), width: Math.round(box.width), height: Math.round(box.height) }
    })
    if (!(length > 0 && hold >= 0)) throw new Error(`scripts/email-art/${name}.html needs <meta name="length"> and <meta name="hold"> in ms`)
    await page.setViewportSize({ width, height })
    const count = Math.round(length * FPS / 1000)
    for (let frame = 0; frame <= count; frame++) {
      await page.evaluate(time => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = time }), frame * 1000 / FPS)
      await page.screenshot({ path: join(frames, `${name}-${String(frame).padStart(3, '0')}.png`) })
    }
    await page.close()
    // The last frame is repeated for the hold; a repeat costs a few bytes, because only the changed rectangle of each
    // frame is re-encoded. One palette for the whole run, so still areas don't shimmer.
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, `${name}-%03d.png`),
      '-vf', `tpad=stop_mode=clone:stop_duration=${hold / 1000},split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
      '-loop', '0', `${OUT}/${name}.gif`])
    await writeFile(`${OUT}/${name}-first-frame.gif`, firstFrame(await readFile(`${OUT}/${name}.gif`)))
    made.push(`${name}.gif`, `${name}-first-frame.gif`)
  }

  if (!names.length || names.includes('raffle-tickets')) {
    // The blog's raffle tickets, rendered from the real component onto a transparent background.
    const source = (await readFile('src/components/RaffleTickets.tsx', 'utf8')).replace("import './RaffleTickets.css'\n", '')
    const { code } = await transformWithOxc(source, 'RaffleTickets.tsx', { jsx: { runtime: 'automatic' } })
    const compiled = 'scripts/email-art/.raffle-tickets.mjs'
    await writeFile(compiled, code)
    let markup
    try { markup = renderToStaticMarkup(createElement((await import(pathToFileURL(compiled).href)).default, TICKETS)) } finally { await rm(compiled) }
    const css = await readFile('src/components/RaffleTickets.css', 'utf8')
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
    made.push('raffle-tickets.png')
  }

  const polaroids = [...(!names.length || names.includes('leads') ? LEADS : []), ...(!names.length || names.includes('panel') ? PANEL : [])]
  if (polaroids.length) {
    // The partner page's own taped Polaroid (src/index.css and src/pages/PartnerPage.css), at its narrowest-phone width
    // on a transparent 280 × 408 picture. The email shows it at half that, so it stays sharp on phones; the caption is
    // set larger than the site's so it still reads at that size. Each further Polaroid is laid over the one before, 192px
    // to the right and 12px lower, and tilted the other way, like the partner page's second card; it covers the right of
    // the one below, so every caption shows.
    const site = (await readFile('src/index.css', 'utf8')).replace(/@font-face[^}]*\}/g, ''), partner = await readFile('src/pages/PartnerPage.css', 'utf8')
    for (const lead of polaroids) {
      const more = lead.people.length - 1
      const page = await browser.newPage({ viewport: { width: 280 + 192 * more, height: 408 + 12 * more }, deviceScaleFactor: lead.scale ?? 1 })
      const prints = await Promise.all(lead.people.map(async (person, i) => `<div class="print"${i ? ` style="position:absolute;top:${12 * i}px;left:${192 * i}px;--tilt:1.8deg;--tape-tilt:2.5deg;"` : lead.tilt ? ` style="--tilt:${lead.tilt[0]};--tape-tilt:${lead.tilt[1]};"` : ''}><div class="partner-person__polaroid"><span class="tape"></span><img src="${await dataUrl(person.photo)}" alt="" width="384" height="480"><h3 class="partner-person__name">${person.caption}</h3></div></div>`))
      await page.setContent(`<!doctype html><style>${site}${partner}
        @font-face { font-family: Caveat; src: url(data:font/woff2;base64,${await font('caveat-variable.woff2')}) format('woff2'); font-weight: 400 700; }
        body { background: transparent; } .print { width: 240px; margin: 23px 0 0 20px; } .partner-person__name { font-size: 2.4rem; }
        </style>${prints.join('')}`)
      await page.evaluate(() => document.fonts.ready)
      // Every print, its tape and its shadow (26px below the print, 12px either side) must fit, or they'd be cut off.
      const fits = await page.evaluate(() => [...document.querySelectorAll('.partner-person__polaroid')].every(polaroid => {
        const print = polaroid.getBoundingClientRect(), tape = polaroid.querySelector('.tape').getBoundingClientRect()
        return print.left >= 12 && print.right <= innerWidth - 12 && print.bottom <= innerHeight - 26 && tape.top >= 0
      }))
      if (!fits) throw new Error(`The Polaroids don't fit ${lead.picture}: make the picture bigger, and show it at half its new width in Attendance.gs`)
      await page.screenshot({ path: `${OUT}/${lead.picture}`, omitBackground: true })
      await page.close()
      made.push(lead.picture)
    }
  }

  if (!names.length || names.includes('supporters')) {
    // Each logo is trimmed of its own margins, so they're all measured alike. The white is part of the picture, as many
    // logos are dark on nothing, so they stay readable when a phone darkens the email.
    const page = await browser.newPage({ viewport: { width: TILE.width, height: TILE.height }, deviceScaleFactor: 2 })
    for (const supporter of SUPPORTERS) {
      const trimmed = await page.evaluate(async src => {
        const image = new Image(); image.src = src; await image.decode()
        const scale = src.startsWith('data:image/svg') ? 1000 / image.naturalWidth : 1, width = Math.round(image.naturalWidth * scale), height = Math.round(image.naturalHeight * scale)
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
        const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height)
        const { data } = context.getImageData(0, 0, width, height)
        let left = width, right = 0, top = height, bottom = 0
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const at = (y * width + x) * 4
          if (data[at] < 230 || data[at + 1] < 230 || data[at + 2] < 230) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
        }
        const cut = document.createElement('canvas'); cut.width = right - left + 1; cut.height = bottom - top + 1
        cut.getContext('2d').drawImage(canvas, -left, -top)
        return { url: cut.toDataURL(), ratio: cut.width / cut.height }
      }, await dataUrl(supporter.logo))
      const roomy = supporter.label ? TILE.maxHeight - 13 : TILE.maxHeight
      const fit = Math.min(1, TILE.maxWidth / Math.sqrt(TILE.area * trimmed.ratio), roomy / Math.sqrt(TILE.area / trimmed.ratio))
      const width = Math.sqrt(TILE.area * trimmed.ratio) * fit * (supporter.scale ?? 1)
      await page.setContent(`<!doctype html><style>
        @font-face { font-family: Inter; src: url(data:font/woff2;base64,${await font('inter-variable.woff2')}) format('woff2'); font-weight: 100 900; }
        html, body { margin: 0; height: 100%; background: white; } body { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        img { display: block; } div { margin-top: 2px; font: 600 9.5px/11px Inter, sans-serif; color: #33475b; white-space: nowrap; }
        </style><img src="${trimmed.url}" alt="" style="width:${width}px;">${supporter.label ? `<div>${supporter.label}</div>` : ''}`)
      await page.evaluate(() => document.fonts.ready)
      // Every email carries all of these, so each is kept small: a palette of 64 colours looks no different at this size.
      const drawn = join(frames, supporter.picture)
      await page.screenshot({ path: drawn })
      execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', drawn, '-vf', 'split[a][b];[a]palettegen=max_colors=64:reserve_transparent=0:stats_mode=full[p];[b][p]paletteuse=dither=none', '-compression_level', '9', `${OUT}/${supporter.picture}`])
      made.push(supporter.picture)
    }
    await page.close()
  }

  for (const file of made) console.log(`${OUT}/${file}: ${Math.round((await stat(`${OUT}/${file}`)).size / 1024)} KB`)
  // The GIFs' fingerprint. The emails add it to each GIF's address (ATT_ART_VERSION in Attendance.gs), because mail
  // apps cache pictures by address; scripts/check-attendance.mjs fails until the two match.
  if (made.some(file => file.endsWith('.gif')) && SCENES.every(name => existsSync(`${OUT}/${name}.gif`))) {
    const hash = createHash('sha256')
    for (const name of SCENES) hash.update(await readFile(`${OUT}/${name}.gif`))
    console.log(`ATT_ART_VERSION for google-apps-script/Attendance.gs: '${hash.digest('hex').slice(0, 8)}'`)
  }
} finally {
  await browser.close()
  await rm(frames, { recursive: true, force: true })
}
