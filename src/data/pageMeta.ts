import { COMMUNITY_PARTNERS } from './communityPartners.ts'
import { publishedPosts } from './posts.ts'
import { SITE } from './site.ts'

export interface PageMetadata {
  path: string
  title: string
  description: string
  image: string
  imageAlt: string
  type: 'website' | 'article'
  noindex?: boolean
}

export const META_SITE_NAME = 'Hult Prize at the University of Windsor'
export const CANONICAL_ORIGIN = SITE.websiteUrl
export const socialImage = (path: string) => `/images/social/${path === '/' ? 'home' : path.slice(1).replaceAll('/', '-')}.png`

const page = (path: string, title: string, description: string, type: PageMetadata['type'] = 'website'): PageMetadata => ({
  path, title, description, type,
  image: socialImage(path),
  imageAlt: `${title}: ${META_SITE_NAME}`,
})

// One source for client navigation, static HTML heads, social cards and the sitemap.
export const PAGE_METADATA: PageMetadata[] = [
  page('/', 'Home', 'Build a business that changes something. Start at Windsor and compete for US$1 million in seed funding at the Hult Prize global final.'),
  page('/about', 'About', 'Meet the student team behind Hult Prize at the University of Windsor and learn how the global student startup competition works.'),
  page('/year-one', 'Year one', 'Our first Hult Prize season: 14 student startups, six Grand Finale teams, two teams at Nationals and Best Program in North America.'),
  page('/this-year', 'This year', 'The 2026–2027 Hult Prize programme at UWindsor: workshops, team support, cash prizes and key dates from Windsor to Nationals in Calgary.'),
  page('/compete', 'Compete', 'Enter Hult Prize with a team of 2–4 students. Check eligibility, find teammates and register before November 20. Entry and workshops are free.'),
  page('/partners', 'Partners', 'Meet the organisations supporting Hult Prize at UWindsor. Explore sponsorship packages or contribute your time, expertise and resources.'),
  page('/contact', 'Find us', 'Visit Hult Prize at Fusion in Windsor, contact the organising team or ask about competing. Students from every institution are welcome.'),
  page('/events', 'Events', 'Workshops, campus events and competition deadlines for Hult Prize at the University of Windsor.'),
  ...COMMUNITY_PARTNERS.map(partner => page(`/partners/${partner.slug}`, partner.name, `${partner.subtitle} ${partner.withUs[0]}`)),
  ...publishedPosts().map(post => page(`/events/${post.slug}`, post.title, post.excerpt, 'article')),
]

export function metadataForPath(pathname: string): PageMetadata {
  const path = pathname.replace(/\/+$/, '') || '/'
  return PAGE_METADATA.find(meta => meta.path === path) ?? {
    path,
    title: 'Page not found',
    description: 'Find your way back to Hult Prize at the University of Windsor: explore the programme, competition dates and ways to contact the team.',
    image: socialImage('/'),
    imageAlt: META_SITE_NAME,
    type: 'website',
    noindex: true,
  }
}

export const metadataTitle = (meta: PageMetadata) => `${meta.title} | ${META_SITE_NAME}`
export const canonicalUrl = (meta: PageMetadata) => new URL(meta.path, CANONICAL_ORIGIN).href
export const metadataImageUrl = (meta: PageMetadata) => new URL(meta.image, CANONICAL_ORIGIN).href
