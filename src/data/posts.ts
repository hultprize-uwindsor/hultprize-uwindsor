export interface Post {
  slug: string
  title: string
  date: string
  category: 'Upcoming' | 'Story'
  excerpt: string
  location?: string
  body: string[]
  cover?: { src: string; alt: string; caption: string }
  // The event's flyer, offered only as a download (the print file) on the details page.
  flyer?: { download: string }
  featured?: boolean
  published: boolean
  // A photo recap shown on the story once the event has passed.
  recap?: 'launch-day'
  // A call to action on the post's card; 'register' adds the official team registration button.
  cta?: 'register'
  // An event someone else runs, with its own registration: the post's main action is registering on the host's site.
  hostRegistration?: { url: string; site: string }
}

// GDG Windsor DevFest, where we have a booth and give a keynote. It's run by GDG Windsor, who handle registration, so it
// is a post rather than an attendance event; the home calendar and the season planner list it from these details.
export const DEVFEST = {
  slug: 'google-devfest',
  title: 'Meet us at Google DevFest',
  day: '2026-11-21',
  time: '8:45 a.m.-5:30 p.m.',
  venue: 'Odette School of Business',
  registration: { url: 'https://wedevfest.com', site: 'wedevfest.com' },
}

// Publish completed stories only after their event date and editorial review.
// Bookable events live in the attendance catalogue, not in editorial posts.
export const POSTS: Post[] = [
  {
    // From the owner's notes (date, times, place, booth and keynote) and wedevfest.com (the event's full name and host).
    slug: DEVFEST.slug,
    title: DEVFEST.title,
    date: DEVFEST.day,
    category: 'Upcoming',
    excerpt: 'Find our booth and our keynote at GDG Windsor DevFest on November 21 at Odette.',
    location: `${DEVFEST.venue}, University of Windsor · 8:45 a.m. to 5:30 p.m. · Register at ${DEVFEST.registration.site}`,
    body: [
      'Hult Prize UWindsor will be at GDG Windsor DevFest 2026 on Saturday, November 21, at the Odette School of Business. DevFest is a day of tech talks and workshops run by GDG Windsor, the local Google Developer Group.',
      'Come to our booth to meet the team and ask about the competition. We are also giving a keynote.',
      `DevFest runs from 8:45 a.m. to 5:30 p.m. It has its own registration: register at ${DEVFEST.registration.site} to attend.`,
      'Registering for DevFest does not enter a team in Hult Prize. Team registration closes November 20, the day before.',
    ],
    hostRegistration: DEVFEST.registration,
    published: true,
  },
  {
    slug: 'registration-closes-november-20',
    title: 'Registration closes November 20',
    date: '2026-11-20',
    category: 'Upcoming',
    excerpt: 'Register your team of 2-4 students for the UWindsor campus round.',
    location: 'Online registration · November 20 deadline',
    body: [
      'Enter with a business idea and a team of two to four students. Entry, workshops and mentoring are free. Register by November 20.',
      'Only one member of your team has to be enrolled at UWindsor. Every member must be a student and 18 or older by February 28, 2027.',
      'Register officially at hultprize.org/register. This is the only registration that counts toward the competition.',
      'No team yet? Join our Discord from the Compete page. We can help you find teammates.',
    ],
    featured: true,
    cta: 'register',
    published: true,
  },
  {
    // Written from the owner's notes and the launch flyer (times, place, booth).
    slug: 'fusion-launch',
    title: 'Fusion launch day',
    date: '2026-10-01',
    category: 'Upcoming',
    excerpt: 'Our new headquarters at Fusion opened on October 1. See photos from the day.',
    recap: 'launch-day',
    location: 'Joyce Entrepreneurship Centre, second floor · 2 p.m. to 4 p.m. · No registration, just drop in',
    flyer: { download: '/images/events/hult-fusion-launch-flyer-print.png' },
    body: [
      'On October 1, Fusion opens on the second floor of the Joyce Entrepreneurship Centre: a new campus space for innovation and entrepreneurship.',
      'Fusion is the new headquarters for Hult Prize UWindsor. Teams will use the space to develop their businesses, meet other students and attend workshops throughout the year.',
      'Visit on launch day to see the space, meet the team and ask about the competition. Students from every institution are welcome.',
      'The afternoon starts at 2 p.m. with a student celebration: an open house and a chance to meet people. From 3 to 4 p.m., the UWindsor President makes the formal announcement.',
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
