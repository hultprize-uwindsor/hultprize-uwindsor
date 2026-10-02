import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { canonicalUrl, metadataForPath, metadataImageUrl, metadataTitle, META_SITE_NAME, PAGE_METADATA, CANONICAL_ORIGIN } from '../src/data/pageMeta.ts'

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

function render(meta) {
  // Strip only the metadata managed here; keep Vite's hashed scripts, CSS and resource hints intact.
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '')
    .replace('</head>', `    ${renderHead(meta)}\n  </head>`)
}

for (const meta of PAGE_METADATA) {
  await access(join(out, meta.image))
  const file = meta.path === '/' ? join(out, 'index.html') : join(out, meta.path.slice(1), 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, render(meta))
}
await writeFile(join(out, '404.html'), render(metadataForPath('/404')))
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGE_METADATA.map(meta => `  <url><loc>${escape(canonicalUrl(meta))}</loc></url>`).join('\n')}\n</urlset>\n`)
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`)
console.log(`Generated metadata HTML for ${PAGE_METADATA.length} pages, a noindex 404, sitemap.xml and robots.txt. Page bodies render in React.`)
