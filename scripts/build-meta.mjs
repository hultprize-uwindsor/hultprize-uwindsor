import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { canonicalUrl, eventMetadata, metadataForPath, metadataImageUrl, metadataTitle, META_SITE_NAME, PAGE_METADATA, CANONICAL_ORIGIN } from '../src/data/pageMeta.ts'
import { eventStructuredData, eventWhen } from '../src/data/eventSeo.ts'

const out = 'dist'
const template = await readFile(join(out, 'index.html'), 'utf8')
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const renderHead = meta => [
  `<title>${escape(metadataTitle(meta))}</title>`,
  `<meta name="description" content="${escape(meta.description)}" />`,
  `<meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow'}" />`,
  `<link rel="canonical" href="${escape(canonicalUrl(meta))}" />`,
  ...Object.entries({ title: metadataTitle(meta), description: meta.description, site_name: META_SITE_NAME, type: meta.type, url: canonicalUrl(meta), image: metadataImageUrl(meta), 'image:alt': meta.imageAlt, 'image:width': 1200, 'image:height': 630 }).map(([key, value]) => `<meta property="og:${key}" content="${escape(value)}" />`),
  ...Object.entries({ card: 'summary_large_image', title: metadataTitle(meta), description: meta.description, image: metadataImageUrl(meta), 'image:alt': meta.imageAlt }).map(([key, value]) => `<meta name="twitter:${key}" content="${escape(value)}" />`),
].join('\n    ')

// The schedule as it stands on the live site, so organisers' edits reach search engines on the next deploy; the
// repository's reference schedule if the live service can't be reached.
async function liveEvents() {
  try {
    const response = await fetch(new URL('/api/attendance?action=events', CANONICAL_ORIGIN), { signal: AbortSignal.timeout(8000) })
    const data = await response.json()
    if (response.ok && data.ok && Array.isArray(data.events) && data.events.length) return data.events
  } catch { /* Offline or unavailable: fall back below. */ }
  return null
}
const live = await liveEvents()
const pages = [...PAGE_METADATA]
if (live) for (const event of live) {
  const meta = eventMetadata(event), at = pages.findIndex(item => item.path === meta.path)
  if (at >= 0) pages[at] = meta
  else pages.push(meta)
}
const events = pages.filter(meta => meta.event).map(meta => meta.event).sort((a, b) => a.startsAt.localeCompare(b.startsAt))

// What a search engine reads before JavaScript runs: the page's text, written into the app's root element. The app
// replaces it as soon as it starts. Event pages also carry schema.org Event data.
const linkStyle = 'color:#be125e'
function prerenderedBody(meta) {
  if (meta.event) {
    const event = meta.event
    return `<main style="max-width:720px;margin:120px auto;padding:0 24px;font-family:Inter,Arial,sans-serif;color:#002b51"><p><a style="${linkStyle}" href="/events">Events</a></p><h1>${escape(event.title)}</h1><p>${escape(eventWhen(event))}</p><p>${escape(event.venue)}, Windsor, Ontario</p><p>${escape(event.description)}</p>${event.preparation ? `<p>${escape(event.preparation)}</p>` : ''}<p>Free to attend. <a style="${linkStyle}" href="/attend?events=${encodeURIComponent(event.id)}">Register to attend</a></p><p>Hosted by ${escape(META_SITE_NAME)}.</p></main>`
  }
  if (meta.path === '/events' || meta.path === '/attend') {
    const items = events.filter(event => event.status !== 'cancelled').map(event => `<li><a style="${linkStyle}" href="/events/${encodeURIComponent(event.id)}">${escape(event.title)}</a>: ${escape(eventWhen(event))}, ${escape(event.venue.split(',').slice(0, 2).join(','))}</li>`).join('')
    return `<main style="max-width:720px;margin:120px auto;padding:0 24px;font-family:Inter,Arial,sans-serif;color:#002b51"><h1>${escape(meta.title)}</h1><p>${escape(meta.description)}</p><ul>${items}</ul></main>`
  }
  return ''
}
// JSON inside a script tag: escape "<" so no value can close the tag.
const jsonLd = data => `<script type="application/ld+json" id="event-structured-data">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`

function render(meta) {
  // Strip only the metadata managed here; keep Vite's hashed scripts, CSS and resource hints intact.
  const head = renderHead(meta) + (meta.event ? `\n    ${jsonLd(eventStructuredData(meta.event, CANONICAL_ORIGIN))}` : '')
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${prerenderedBody(meta)}</div>`)
}

for (const meta of pages) {
  await access(join(out, meta.image))
  const file = meta.path === '/' ? join(out, 'index.html') : join(out, meta.path.slice(1), 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, render(meta))
}
await writeFile(join(out, '404.html'), render(metadataForPath('/404')))
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(meta => !meta.noindex).map(meta => `  <url><loc>${escape(canonicalUrl(meta))}</loc></url>`).join('\n')}\n</urlset>\n`)
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`)
console.log(`Generated metadata HTML for ${pages.length} pages (${events.length} events from the ${live ? 'live' : 'reference'} schedule), a noindex 404, sitemap.xml and robots.txt. Page bodies render in React.`)
