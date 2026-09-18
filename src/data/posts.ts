export interface Post {
  slug: string
  title: string
  date: string
  category: 'Upcoming' | 'Story'
  excerpt: string
  location?: string
  body: string[]
  cover?: { src: string; alt: string; caption: string }
  featured?: boolean
  published: boolean
}

// Publish completed stories only after their event date and editorial review.
// Upcoming session posts remain drafts until their time and location are confirmed.
export const POSTS: Post[] = [
  {
    slug: 'registration-closes-november-20',
    title: 'Registration closes November 20',
    date: '2026-11-20',
    category: 'Upcoming',
    excerpt: 'An idea, two to four people, four minutes. Register your team for the University of Windsor campus round.',
    location: 'Online registration · November 20 deadline',
    body: [
      'You need an idea, two to four people, and four minutes. Not a company, not a prototype, not a business degree. We teach the rest and it costs you nothing. Registration closes November 20.',
      'Only one member of your team has to be enrolled at UWindsor. Every member must be a student and 18 or older at the time of registration.',
      'Register officially at hultprize.org/register. This is the only registration that counts toward the competition.',
      'No team yet? Join the mixer chat on the Compete page. We match people and it works.',
    ],
    featured: true,
    published: true,
  },
  {
    slug: 'brand-and-pitch-bootcamp', title: 'Brand and pitch bootcamp begins', date: '2026-10-26', category: 'Upcoming',
    excerpt: 'Build your brand and pitch with Sterling Cybersecurity and Advisory Group, from late October through November 30.',
    body: [], published: false,
  },
  {
    slug: 'grand-finale-2027', title: 'The Grand Finale', date: '2027-02-05', category: 'Upcoming',
    excerpt: 'Four-minute pitches and four minutes of questions, in front of judges from the Windsor business community.',
    body: [], published: false,
  },
  {
    slug: 'fusion-launch', title: 'Hult Prize UWindsor has a home', date: '2026-09-29', category: 'Story',
    excerpt: 'Fusion opened on the second floor of the Joyce Entrepreneurship Centre, and we have an HQ inside it.',
    body: [], published: false,
  },
]

export function publishedPosts() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  return POSTS.filter(p => p.published && (p.category !== 'Story' || p.date <= today)).sort((a, b) => b.date.localeCompare(a.date))
}

export function formatPostDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
}
