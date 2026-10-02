export interface Post {
  slug: string
  title: string
  date: string
  category: 'Upcoming' | 'Story'
  excerpt: string
  location?: string
  body: string[]
  cover?: { src: string; alt: string; caption: string }
  // A portrait flyer shown whole beside the text on the details page, with the print file to download.
  flyer?: { src: string; alt: string; width: number; height: number; download: string }
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
    excerpt: 'Register your team of 2–4 students for the UWindsor campus round.',
    location: 'Online registration · November 20 deadline',
    body: [
      'Enter with a business idea and a team of two to four students. Entry, workshops and mentoring are free. Register by November 20.',
      'Only one member of your team has to be enrolled at UWindsor. Every member must be a student and 18 or older by February 28, 2027.',
      'Register officially at hultprize.org/register. This is the only registration that counts toward the competition.',
      'No team yet? Join the team matching chat on the Compete page. We can help you find teammates.',
    ],
    featured: true,
    published: true,
  },
  {
    slug: 'workshop-series', title: 'Workshop series opens', date: '2026-11-07', category: 'Upcoming',
    excerpt: 'Five workshop sessions from November 7, 2026, through January 9, 2027.',
    body: [], published: false,
  },
  {
    slug: 'grand-finale-2027', title: 'The Grand Finale', date: '2027-02-05', category: 'Upcoming',
    excerpt: 'Pitch to Windsor business judges: 4 minutes to present, 4 minutes for questions.',
    body: [], published: false,
  },
  {
    // Written from the owner's notes and the launch flyer (times, place, booth).
    slug: 'fusion-launch',
    title: 'Fusion launch day',
    date: '2026-10-01',
    category: 'Upcoming',
    excerpt: 'Visit our new headquarters at Fusion on October 1, 2–4 PM.',
    location: 'Joyce Entrepreneurship Centre, second floor · 2 PM to 4 PM · No registration, just drop in',
    flyer: { src: '/images/events/hult-fusion-launch-flyer.jpg', alt: 'Fusion launch day flyer. Its date, times, place and booth activities are listed on this page.', width: 1100, height: 1424, download: '/images/events/hult-fusion-launch-flyer-print.png' },
    body: [
      'On October 1, Fusion opens on the second floor of the Joyce Entrepreneurship Centre: a new campus space for innovation and entrepreneurship.',
      'Fusion is the new headquarters for Hult Prize UWindsor. Teams will use the space to develop their businesses, meet other students and attend workshops throughout the year.',
      'Visit on launch day to see the space, meet the team and ask about the competition. Students from every institution are welcome.',
      'The afternoon starts at 2 PM with a student celebration: an open house and a chance to meet people. From 3 to 4 PM, the UWindsor President makes the formal announcement.',
      'Find the Hult Prize booth to play Real or Fake, our game, and win a prize. You can also sign up for this year\'s competition there, or find a team if you need one. Registration for the competition closes November 20.',
      'The launch itself needs no registration. Just drop in.',
    ],
    published: true,
  },
]

export function publishedPosts() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  return POSTS.filter(p => p.published && (p.category !== 'Story' || p.date <= today)).sort((a, b) => b.date.localeCompare(a.date))
}

// Published events from today on, soonest first, for the home page strip.
export function upcomingPosts() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  return publishedPosts().filter(p => p.category === 'Upcoming' && p.date >= today).sort((a, b) => a.date.localeCompare(b.date))
}

export function formatPostDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function postStatus(post: Post): 'Upcoming' | 'Past event' | 'Story' {
  if (post.category === 'Story') return 'Story'
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })
  return post.date < today ? 'Past event' : 'Upcoming'
}
