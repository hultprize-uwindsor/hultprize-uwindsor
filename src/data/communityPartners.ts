// Community partners with their own page under /partners/<slug>, listed in the header's Partners menu.
// "about", the resources and the people come from each organisation's own official site (sources beside each
// partner, checked October 28, 2026); "withUs" and "support" use facts on this site, Fusion's letter of support
// (October 22, 2026) and the organisations' own news. Photos are the people's official headshots from those sites,
// cropped to 4:5 portraits. All of it needs the owner's approval, and each partner's, before launch (docs/launch-notes.md).
export interface PartnerPerson {
  name: string
  title: string // as the organisation's own site gives it
  role?: string // what they do that matters to student founders
  photo?: string // their official photo, 4:5, under /public/images/partners/people/
  profile?: string // their official profile page
}

export interface PartnerResource {
  name: string
  text: string
  who?: string
  cost?: string
  access: string // how a student gets it
  link?: [href: string, label: string]
}

export interface CommunityPartner {
  slug: string
  name: string
  shortName: string // in headings: "How Fusion supports us"
  subtitle: string
  url: string // empty until confirmed; the page then omits the website link
  logo?: string
  email?: string
  about: string[]
  withUs: string[]
  // What the partner does for Hult Prize UWindsor, item by item.
  support: { title: string; text: string }[]
  resourcesIntro?: string
  resources: PartnerResource[]
  peopleIntro?: string
  people: PartnerPerson[]
}

const FUSION_PAGE = 'https://www.uwindsor.ca/fusion/'

export const COMMUNITY_PARTNERS: CommunityPartner[] = [
  {
    slug: 'fusion',
    name: 'Fusion',
    shortName: 'Fusion',
    subtitle: 'Our campus headquarters.',
    url: FUSION_PAGE,
    logo: '/images/partners/fusion.png',
    email: 'Fusion@uwindsor.ca',
    // Sources: uwindsor.ca/fusion, /fusion/303/our-team and /fusion/304 to /fusion/311 (one page per program).
    about: [
      'Fusion is the University of Windsor’s Innovation and Entrepreneurship Network. It supports students, faculty, researchers and graduates through the Office of Innovation, Partnerships and Entrepreneurship.',
      'Fusion is on the 2nd floor of the Joyce Entrepreneurship Centre, 2455 Wyandotte St. W., at the southeast corner of Wyandotte Street West and Sunset Avenue.',
    ],
    withUs: [
      'Fusion is our campus headquarters. Teams meet here to develop their businesses, attend workshops and connect with other students.',
    ],
    // From Fusion's letter of support and UWindsor's announcement of the opening (uwindsor.ca/publicaffairs, October 7, 2026).
    support: [
      { title: 'A home on campus', text: 'Our organising team works from desks at Fusion, and teams in this year’s competition can use its workspace all term.' },
      { title: 'Where our season began', text: 'Our season started at Fusion’s launch on October 1, 2026. UWindsor’s announcement of the opening named Hult Prize among the student organisations working with Fusion.' },
      { title: 'Print and promotion', text: 'Fusion contributed to our print and promotional materials this season.' },
      { title: 'Next steps after the competition', text: 'Our top three campus teams get further training and pitching opportunities through UWill Discover, and teams ready for business advice can be referred to WEtech Alliance.' },
    ],
    // Opening hours are left out: Fusion lists 8:30am to 4:30pm, and our Contact page says 9am to 4pm.
    resourcesIntro: 'Fusion runs these through UWindsor’s Office of Innovation, Partnerships and Entrepreneurship. Some open once a year, so check each program’s page for the next intake.',
    resources: [
      { name: 'The Fusion Reactor and MakerSpace', text: 'Space to work with your team, meet mentors and come to workshops, plus the MakerSpace’s tools for building a prototype.', who: 'UWindsor students, student clubs partnered with Fusion, faculty and researchers', access: 'Drop in to the second floor of the Joyce Entrepreneurship Centre, Monday to Friday.', link: [`${FUSION_PAGE}304/your-space-create`, 'About the space'] },
      { name: 'Windsor Innovation Challenge', text: 'A four-month challenge in which student teams work on real problems from the City of Windsor, ending in a pitch competition.', who: 'UWindsor and St. Clair College students in any program', access: 'Apply from November 2 to December 11, 2026. The challenge runs from January 29 to May 28, 2027.', link: [`${FUSION_PAGE}306/windsor-innovation-challenge`, 'About the challenge'] },
      { name: 'VentureU Bootcamp', text: 'A five-day Reading Week bootcamp in which teams build a venture and pitch for one of two $5,000 cash prizes, with lunch every day.', access: 'This year’s bootcamp ran from October 13 to 17. Watch Fusion’s page for the next one.', link: [`${FUSION_PAGE}305/ventureu-bootcamp`, 'About the bootcamp'] },
      { name: 'Innovation Fellowship', text: 'A summer cohort with mentoring, weekly workshops and up to $12,000 in non-dilutive funding, for ventures past the idea stage.', who: 'Current students, graduates from Spring 2023 on, faculty and affiliated researchers', access: 'The 2026 cohort has finished. Applications for the next one open on Fusion’s page.', link: [`${FUSION_PAGE}310/innovation-fellowship`, 'About the fellowship'] },
      { name: 'NextGen CTO', text: 'A five-week micro-credential in intellectual property: an online course paired with live virtual sessions.', who: 'All UWindsor students, in any faculty', access: 'Applications for this fall’s run have closed. Watch Fusion’s page for the next one.', link: [`${FUSION_PAGE}307/nextgen-cto`, 'About NextGen CTO'] },
      { name: 'University Affiliated Startups', text: 'A renewable one-year affiliation with help on commercialisation, intellectual property and finding funding.', who: 'Includes student and alumni founders building on innovations from a UWindsor lab', access: 'Email Fusion@uwindsor.ca with the subject “UAS Application”.', link: [`${FUSION_PAGE}311/university-affiliated-startups`, 'About affiliation'] },
    ],
    peopleIntro: 'Sydney Thompson is the person to ask about most of Fusion’s programs.',
    // In the order of Fusion's team page (uwindsor.ca/fusion/303/our-team), with its titles where they differ from the
    // people's own pages. Photos are from each person's UWindsor profile: Paul Brereton's carries another person's
    // name in its alt text, but the owner confirmed it's him. Kevin Milne's and Nick Vukotic's lines are from their
    // faculty profiles and UWindsor News (March 6, 2026).
    people: [
      { name: 'Tom Schnekenburger', title: 'Director, Innovation, Partnerships and Entrepreneurship', role: 'Leads the University’s innovation and entrepreneurship office, which runs Fusion.', photo: '/images/partners/people/fusion-tom-schnekenburger.webp', profile: 'https://www.uwindsor.ca/research/407/tom-schnekenburger' },
      { name: 'Sydney Thompson', title: 'Entrepreneurship Program Coordinator', role: 'Coordinates Fusion’s entrepreneurship programs, workshops, bootcamps, pitch competitions and founder support.', photo: '/images/partners/people/fusion-sydney-thompson.webp', profile: 'https://www.uwindsor.ca/research/392/sydney-thompson' },
      { name: 'Paul Brereton', title: 'Business Development and IP Commercialization Officer', role: 'Works on business development and on commercialising research and intellectual property.', photo: '/images/partners/people/fusion-paul-brereton.webp', profile: 'https://www.uwindsor.ca/research/415/paul-brereton' },
      { name: 'Mary Jane Nohra', title: 'Innovation Administration Coordinator', role: 'Handles intellectual property and technology transfer matters, and research events.', photo: '/images/partners/people/fusion-mary-jane-nohra.webp', profile: 'https://www.uwindsor.ca/research/393/mary-jane-nohra' },
      { name: 'Dr. Kevin Milne', title: 'Associate Professor, Kinesiology', role: 'Researches cardiovascular health and rehabilitation in his Physical Activity and Cardiovascular Research lab.', photo: '/images/partners/people/fusion-kevin-milne.webp', profile: 'https://www.uwindsor.ca/kinesiology/458/dr-kevin-milne' },
      { name: 'Dr. Nick Vukotic', title: 'Associate Professor, Science', role: 'Industrial Research Chair in X-ray Diffraction and Crystalline Materials. His lab’s inventions led to the UWindsor spinoff Solid4m.', photo: '/images/partners/people/fusion-nick-vukotic.webp', profile: 'https://www.uwindsor.ca/science/chemistry/549/faculty-dr-nick-vukotic' },
    ],
  },
  {
    slug: 'sterling',
    name: 'Sterling Cybersecurity and Advisory Group',
    shortName: 'Sterling',
    subtitle: 'Our bootcamp workshop partner.',
    url: 'https://www.sterlinginfo.com/',
    logo: '/images/partners/sterling-cybersecurity-advisory-group.png',
    email: 'moreinfo@sterlinginfo.com',
    // Sources: sterlinginfo.com (/who-we-are, /wesecure, /training, /contact), averti.institute and the UWindsor School
    // of Computer Science's workshop series page. Sterling's site names none of its people: their titles are as the
    // owner gave them, and Peaches's surname is as UWindsor News gives it. Neil's photo is the headshot WEtech published
    // with his board bio (wetech-alliance.com/our-board, archived October 2024). Peaches's photo and line are from the
    // bio sheet Sterling gave us, shortened.
    about: [
      'Sterling provides cybersecurity, governance, risk and compliance services. It started as a hardware company in 1993 and had moved fully into information security and operational risk consulting by 2005. It is headquartered in Toronto, with an operational office in Windsor.',
      'Sterling also works with UWindsor’s School of Computer Science, running a weekly workshop series and a pathway in which students go on to work alongside its team.',
    ],
    withUs: [
      'Sterling Cybersecurity and Advisory Group delivers our bootcamp this season, five free workshops that take a team from its first idea to a finished pitch.',
    ],
    support: [
      { title: 'Five workshops and coaching', text: 'Sterling delivers our five bootcamp workshops and coaches the teams: problem, insight and story; solution, business model and impact; traction, market and financials; delivery, storytelling and slide design; and a dress rehearsal with Q&A.' },
      { title: 'With FRCT', text: 'The workshops are sponsored by FRCT, a cyber first-aid program that Sterling delivers with WEtech Alliance as industry partner and the University of Windsor as academic partner.' },
    ],
    resources: [
      { name: 'WEsecure', text: 'A free six-month program that builds a startup’s security basics: a risk assessment, an incident response plan, SOC 2 readiness guidance, a device policy, awareness training and Cyber Defence+ certification.', who: 'Startups in Windsor-Essex', cost: 'Free', access: 'The conversation starts with WEtech Alliance, or request a consultation on the WEsecure site.', link: ['https://www.wesecure.it/contact.html', 'Request a consultation'] },
      { name: 'A pathway for computer science students', text: 'Students start with Sterling’s workshops, then can go on to be teaching assistants and WEsecure Practitioners working with Sterling’s team. Completing the ten-week program earns a micro-credential.', who: 'UWindsor computer science undergraduate and graduate students. Teaching assistant and practitioner roles are by invitation.', access: 'Start with the workshop series.', link: ['https://sterlinginfo.com/wesecure', 'About the pathway'] },
      { name: 'Sterling Cybersecurity Workshop Series', text: 'Weekly cybersecurity workshops with Sterling at UWindsor’s School of Computer Science this fall.', access: 'Thursdays at noon until December 3, 2026.', link: ['https://www.uwindsor.ca/science/computerscience/494001/sterling-cybersecurity-workshop-series', 'See the series'] },
      { name: 'EC-Council Essentials courses', text: 'Self-paced courses that give you a grounding in cybersecurity, such as Ethical Hacking Essentials and SOC Essentials.', cost: '$99 per course', access: 'Enrol through Sterling’s training page.', link: ['https://sterlinginfo.com/training', 'See the courses'] },
      { name: 'Complimentary Security Discovery Review', text: 'A free first look at how secure your organisation is, with no obligation.', cost: 'Free', access: 'Email moreinfo@sterlinginfo.com with the subject “Complimentary Security Discovery Review”.', link: ['mailto:moreinfo@sterlinginfo.com?subject=Complimentary%20Security%20Discovery%20Review', 'Email Sterling'] },
      { name: 'FRCT Cyber First Aid', text: 'A 90-minute course with five modules and a tabletop drill that teaches staff what to do when a cyber attack hits: assess, block, hand off.', who: 'Workplaces and their staff', access: 'Email moreinfo@averti.ca with the subject “FRCT workplace training enquiry”.', link: ['https://www.averti.institute/frct.html', 'About FRCT'] },
    ],
    people: [
      { name: 'Neil Cesario', title: 'Director and Chief Information Security Officer', role: 'Leads Sterling’s cybersecurity advisory practice.', photo: '/images/partners/people/sterling-neil-cesario.webp' },
      { name: 'Peaches Madarang-Cesario', title: 'Chief Operating Officer', role: 'Has advised startups since 2014, and mentors women and underrepresented students toward careers in cybersecurity.', photo: '/images/partners/people/sterling-peaches-madarang-cesario.webp' },
    ],
  },
  {
    slug: 'wetech',
    name: 'WEtech Alliance',
    shortName: 'WEtech',
    subtitle: 'Our technology and innovation partner.',
    url: 'https://www.wetech-alliance.com/',
    logo: '/images/partners/wetech-alliance.png',
    email: 'info@wetech-alliance.com',
    // Sources: wetech-alliance.com (/who-we-are, /our-team, /contact, /client, /blueprint, /perks, /scaleup, /jobs, /events)
    // and its Hult Prize posts of October 31, 2025 and September 17, 2026.
    about: [
      'WEtech Alliance is a non-profit supporting technology businesses in Windsor-Essex and Chatham-Kent. Since 2011, it has provided business advice, training, mentoring and support for intellectual property and commercialisation.',
      'It is one of seventeen Regional Innovation Centres in Ontario. Its office is in GreenShield Hall, 167 Ferry Street, Suite 204, in downtown Windsor.',
    ],
    withUs: [
      'WEtech Alliance helped fund our first season in 2025-2026 as our technology and innovation partner.',
    ],
    support: [
      { title: 'Funding our first season', text: 'WEtech was one of the ten partners whose support brought the Hult Prize campus competition to Windsor.' },
      { title: 'Sharing our story', text: 'WEtech covered our launch in 2025 and our return this September, when it shared that the Hult Prize Foundation had named UWindsor North America’s program of the year.' },
      { title: 'Where teams go next', text: 'Teams ready for business advice can be referred to WEtech to be considered as clients.' },
    ],
    resourcesIntro: 'Most of WEtech’s services start with becoming a client. If your idea has technology or innovation at its core, here’s where to begin.',
    resources: [
      { name: 'Innovation Blueprint', text: 'A free workshop on turning an idea into a business: defining the problem, sizing the market and planning a minimum viable product.', who: 'Anyone thinking about starting a business or commercialising an idea', cost: 'Free, in person or online', access: 'Next session: Thursday, November 19, 2026, 3:30 to 5:30 pm, 167 Ferry Street. Register on Eventbrite.', link: ['https://www.eventbrite.ca/e/innovation-blueprint-windsor-tickets-2002581926450', 'Register for Innovation Blueprint'] },
      { name: 'Business advice', text: 'WEtech’s way in to business advice, mentoring and its other services. You apply, then book a time with a business advisor.', who: 'Tech and innovation businesses at any stage. Other businesses are pointed to the Small Business Centres.', access: 'Apply on WEtech’s client page, then book a meeting.', link: ['https://www.wetech-alliance.com/client/', 'Apply to become a client'] },
      { name: 'Client perks', text: 'Discounts for WEtech clients, including 90% off HubSpot for Startups in the first year, up to $100,000 in Google Cloud credits and a free .CA domain.', who: 'WEtech clients', access: 'Ask your WEtech business advisor.', link: ['https://www.wetech-alliance.com/perks/', 'See the perks'] },
      { name: 'ScaleUP Accelerator', text: 'A growth accelerator with up to 30 hours of mentorship and workshops on AI, cybersecurity, investor readiness and pitching.', who: 'Startups ready to grow', access: 'Applications are closed for now. Sign up for ScaleUPdates to hear when the next cohort opens.', link: ['https://www.wetech-alliance.com/scaleup/', 'About ScaleUP'] },
      { name: 'Tech jobs board', text: 'Tech jobs in the region gathered from more than 50 job boards, alongside Tech Connect for students, professionals and employers.', who: 'Students and job seekers', access: 'Browse the board on WEtech’s site.', link: ['https://www.wetech-alliance.com/jobs/', 'Browse tech jobs'] },
      { name: 'Events', text: 'A community calendar of tech and startup events across Windsor-Essex, from workshops to meetups.', access: 'See what’s on and register on WEtech’s events page.', link: ['https://www.wetech-alliance.com/events/', 'See upcoming events'] },
    ],
    // Titles and photos from wetech-alliance.com/our-team. WEtech crops its headshots to circles with the heads at the
    // top edge, so each portrait is widened past the circle, its corners rebuilt from the photo's own background.
    people: [
      { name: 'Yvonne Pilon', title: 'President and CEO', photo: '/images/partners/people/wetech-yvonne-pilon.webp' },
      { name: 'Adam Castle', title: 'Director of Venture Services and Partnerships', role: 'The contact for the ScaleUP Accelerator and WEsecure.', photo: '/images/partners/people/wetech-adam-castle.webp' },
      { name: 'Susana Martins', title: 'Business Advisor and Manager of Startup Services', role: 'The contact for Innovation Blueprint.', photo: '/images/partners/people/wetech-susana-martins.webp' },
      { name: 'Susy Kustra', title: 'Manager of Programs and Client Experience', role: 'The contact for WEtech’s Financial Bootcamp workshops for founders.', photo: '/images/partners/people/wetech-susy-kustra.webp' },
    ],
  },
]

export const findCommunityPartner = (slug?: string) => COMMUNITY_PARTNERS.find(partner => partner.slug === slug)
