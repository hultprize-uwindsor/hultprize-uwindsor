// Community partners with their own page under /partners/<slug>, listed in the header's Partners menu.
// "about" describes the organisation from its own official site; "withUs" uses only facts already on
// this site. Both need the owner's approval before launch (docs/launch-notes.md).
export interface CommunityPartner {
  slug: string
  name: string
  subtitle: string
  url: string // empty until confirmed; the page then omits the website link
  logo?: string
  about: string[]
  withUs: string[]
}

export const COMMUNITY_PARTNERS: CommunityPartner[] = [
  {
    slug: 'fusion',
    name: 'Fusion',
    subtitle: 'Where Hult Prize UWindsor is based on campus.',
    url: 'https://www.uwindsor.ca/fusion/',
    logo: '/images/partners/uwindsor.png',
    // Sources: uwindsor.ca/fusion and uwindsor.ca/fusion/304/your-space-create.
    about: [
      'Fusion, the Fusion Innovation and Entrepreneurship Network, is a university-wide platform at the University of Windsor, within the Office of Innovation, Partnerships and Entrepreneurship. It supports students, faculty, researchers and graduates from across the University by creating pathways into entrepreneurship, innovation and commercialisation.',
      'The Fusion Reactor offers flexible space for individual work, team collaboration, mentorship, workshops, events and venture development, and the University of Windsor MakerSpace gives students tools and resources to help turn ideas into prototypes.',
    ],
    // Opening hours are left out: Fusion lists 8:30am to 4:30pm, and our Contact page says 9am to 4pm.
    withUs: [
      'Hult Prize UWindsor sits inside Fusion, a hub on campus for people building things. Our teams work there, argue about their business models there, and run into people building their own things. We run sessions and events out of it through the year.',
      'Fusion is on the 2nd floor of the Joyce Entrepreneurship Centre, 2455 Wyandotte St. W., at the southeast corner of Wyandotte Street West and Sunset Avenue.',
    ],
  },
  {
    slug: 'sterling',
    name: 'Sterling Cybersecurity and Advisory Group',
    subtitle: 'Running our brand and pitch bootcamp.',
    url: 'https://www.sterlinginfo.com/',
    logo: '/images/partners/sterling-cybersecurity-advisory-group.png',
    // Sources: sterlinginfo.com, sterlinginfo.com/who-we-are and sterlinginfo.com/wesecure.
    about: [
      'Sterling Cybersecurity and Advisory Group provides cybersecurity, governance, risk and compliance services to organisations. It started in 1993 as a hardware company and, by 2005, had moved fully into information security and operational risk consulting.',
      'It oversees WEsecure, a free six-month cybersecurity program for Windsor Essex startups, run with WEtech Alliance and the University of Windsor School of Computer Science.',
    ],
    withUs: [
      'Sterling Cybersecurity and Advisory Group runs our brand and pitch bootcamp with us: four weekly sessions from the week of November 14, and a fifth in early January after exams.',
    ],
  },
  {
    slug: 'wetech',
    name: 'WEtech Alliance',
    subtitle: 'Technology and innovation ecosystem partner.',
    url: 'https://www.wetech-alliance.com/',
    logo: '/images/partners/wetech-alliance.png',
    // Source: wetech-alliance.com/who-we-are.
    about: [
      'WEtech Alliance has supported technology and innovation in the Windsor-Essex and Chatham-Kent regions of Ontario since 2011. It is a non-profit organisation that gives entrepreneurs and companies business services, training, intellectual property and commercialisation support, mentorship and connections, to help them bring new ideas to market and scale up.',
      'It is one of seventeen Regional Innovation Centres in Ontario.',
    ],
    withUs: [
      'WEtech Alliance was one of the ten organisations that funded Hult Prize UWindsor in its first year, 2025 to 2026, as our technology and innovation ecosystem partner. It is one of our community partners.',
    ],
  },
]

export const findCommunityPartner = (slug?: string) => COMMUNITY_PARTNERS.find(partner => partner.slug === slug)
