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
    subtitle: 'Our campus headquarters.',
    url: 'https://www.uwindsor.ca/fusion/',
    logo: '/images/partners/uwindsor.png',
    // Sources: uwindsor.ca/fusion and uwindsor.ca/fusion/304/your-space-create.
    about: [
      'Fusion is the University of Windsor’s Innovation and Entrepreneurship Network. It supports students, faculty, researchers and graduates through the Office of Innovation, Partnerships and Entrepreneurship.',
      'The Fusion Reactor provides space for team work, mentoring, workshops and events. The University’s MakerSpace provides tools and resources for prototyping.',
    ],
    // Opening hours are left out: Fusion lists 8:30am to 4:30pm, and our Contact page says 9am to 4pm.
    withUs: [
      'Fusion is our campus headquarters. Teams meet here to develop their businesses, attend workshops and connect with other students.',
      'Fusion is on the 2nd floor of the Joyce Entrepreneurship Centre, 2455 Wyandotte St. W., at the southeast corner of Wyandotte Street West and Sunset Avenue.',
    ],
  },
  {
    slug: 'sterling',
    name: 'Sterling Cybersecurity and Advisory Group',
    subtitle: 'Our brand and pitch workshop partner.',
    url: 'https://www.sterlinginfo.com/',
    logo: '/images/partners/sterling-cybersecurity-advisory-group.png',
    // Sources: sterlinginfo.com, sterlinginfo.com/who-we-are and sterlinginfo.com/wesecure.
    about: [
      'Sterling provides cybersecurity, governance, risk and compliance services. Founded in 1993, it moved into information security and operational risk consulting in 2005.',
      'Through WEsecure, Sterling also offers a free six-month cybersecurity program for Windsor-Essex startups with WEtech Alliance and UWindsor’s School of Computer Science.',
    ],
    withUs: [
      'Sterling Cybersecurity and Advisory Group supports brand and pitch training. This year’s workshop series runs from November 7, 2026, through January 9, 2027, with five sessions.',
    ],
  },
  {
    slug: 'wetech',
    name: 'WEtech Alliance',
    subtitle: 'Our technology and innovation partner.',
    url: 'https://www.wetech-alliance.com/',
    logo: '/images/partners/wetech-alliance.png',
    // Source: wetech-alliance.com/who-we-are.
    about: [
      'WEtech Alliance is a non-profit supporting technology businesses in Windsor-Essex and Chatham-Kent. Since 2011, it has provided business advice, training, mentoring and support for intellectual property and commercialisation.',
      'It is one of seventeen Regional Innovation Centres in Ontario.',
    ],
    withUs: [
      'WEtech Alliance helped fund our first season in 2025–2026 as the technology and innovation partner. Its support was part of the ten-partner effort that brought the campus competition to Windsor.',
    ],
  },
]

export const findCommunityPartner = (slug?: string) => COMMUNITY_PARTNERS.find(partner => partner.slug === slug)
