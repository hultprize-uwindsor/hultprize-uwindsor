export interface TeamMember {
  name: string
  role: string
  bio: string
  photo: string // path under /public/images/team/
}

// Photo files live in public/images/team/. Three headshots are still
// unmatched to a name (see the mapping question asked in chat) — those
// three use the placeholder silhouette until confirmed.
export const TEAM: TeamMember[] = [
  {
    name: 'Mahnoz Akhtari',
    role: 'Campus Director',
    bio: 'Mahnoz is a software developer and founder — she founded Grayfel Technologies Inc. and works as a software engineer at Sterling Cybersecurity and Advisory Group, alongside building two startups of her own. Before Hult Prize, she was Head of Events for the AI Club at UWindsor.',
    photo: '/images/team/mahnoz-akhtari.jpg',
  },
  {
    name: 'Yusriyah Rahman',
    role: 'Judges and Experts Coordinator',
    bio: "Yusriyah is a fourth-year Computer Science student with a minor in Mathematics. Her experience spans data analysis and PMO work at GFX Solutions, full-stack development at Glendor Inc., and research on deep learning for environmental change detection presented at the ISPRS Congress.",
    photo: '/images/team/placeholder.svg',
  },
  {
    name: 'Yumna Sumya',
    role: 'Marketing and Media Coordinator',
    bio: "Yumna is a Computer Science student with a minor in Information Technology. She works as a Teaching Assistant and was a Corporate Data Analyst Intern at Pioneer Medical Group, and holds the President's Scholarship and a spot on the Faculty of Science Dean's Honour Roll.",
    photo: '/images/team/yumna-sumya.jpg',
  },
  {
    name: 'Sura Gaafar',
    role: 'Events Coordinator',
    bio: "Sura is a third-year Honours Computer Science Co-op student with a minor in Mathematics. She's completed a Software Engineering internship at RIIS, is now a Research Assistant modelling environmental change across the Great Lakes Basin, and co-founded Black Students in Computer Science.",
    photo: '/images/team/placeholder.svg',
  },
  {
    name: 'Rachael "Bobola" Juru',
    role: 'Deputy Campus Director',
    bio: 'Rachael is a fourth-year Business Administration student specializing in Human Resources. As Deputy Campus Director, she keeps the program’s teams, workshops, and campus finals running and on schedule.',
    photo: '/images/team/placeholder.svg',
  },
  {
    name: 'Julia Adu-Bobie',
    role: 'Partnerships and Sponsorships Coordinator',
    bio: 'Julia is a fourth-year Business Administration student with a minor in Applied IT. She owns sponsorship for the program this year — the prospect pipeline, the tier structure, and a $15,000 target that funds the venue, print, and every event on the calendar.',
    photo: '/images/team/placeholder.svg',
  },
]
