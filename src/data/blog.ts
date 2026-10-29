import { SITE } from './site.ts'

// A paragraph, a subheading, or numbered steps.
export type BlogBlock = string | { heading: string } | { steps: string[] }

// What stands in for a cover picture on the post's card and beside the article. Each kind of post has its own paper,
// so readers can tell a story from a notice without a tag: a story is taped Polaroids, a sponsor notice is a typed note
// with the prize circled in marker, and the term's minigame is a strip of raffle tickets.
export type BlogArt =
  | { kind: 'photos'; front: string; back: string; caption: string }
  | { kind: 'note'; paper: 'index' | 'legal'; what: string; amount: string; thanks: string }
  | { kind: 'tickets'; game: string; prize: string; draw: string }

export type BlogAction = { label: string; to: string } | { label: string; href: string } | 'register'

export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  art: BlogArt
  body: BlogBlock[]
  // The post's key facts, listed beside the article.
  facts?: [label: string, value: string][]
  actions?: BlogAction[]
  // Launch day's photo gallery, shown under the article.
  gallery?: 'launch-day'
  // The event page this post tells the story of; that page links back here.
  event?: string
  featured?: boolean
  published: boolean
}

const GRAND_FINALE = 'Campus Grand Finale, February 4, 2027'

export const BLOG_POSTS: BlogPost[] = [
  {
    // From the owner's announcement of this year's minigame (October 2026), sponsored by Grayfel Technologies Inc.
    slug: 'the-ticket-jar',
    title: 'The Ticket Jar: every event is a shot at $200',
    date: '2026-10-28',
    excerpt: 'This term’s minigame is open to everyone, competing or not. Collect a ticket at every event you come to, and one lucky ticket wins $200 at the Grand Finale.',
    art: { kind: 'tickets', game: 'The Ticket Jar', prize: '$200', draw: 'Drawn Feb 4, 2027' },
    body: [
      'Every year, we run one minigame that lasts the whole term, and everyone can play. You don’t need a team or a business idea, and you don’t have to be competing. You just have to show up.',
      'This year’s game is the Ticket Jar, and there’s $200 cash on the line, thanks to Grayfel Technologies Inc.',
      { heading: 'How to play' },
      { steps: [
        'Come to any Hult Prize UWindsor event or workshop.',
        'Grab your free raffle ticket at check-in and drop it in the jar.',
        'Keep coming back. Every event you attend adds another ticket, and your tickets stay in the jar all term.',
        'At the Grand Finale on February 4, 2027, we give the jar a good shake and draw one ticket at random. Its owner wins $200.',
      ] },
      { heading: 'Stack the odds' },
      'The more events you come to, the more tickets you have in the jar. Come to five events and you’re in the draw five times.',
      'The events are worth it even without the prize. A mixer might introduce you to someone from another faculty. A workshop could turn half an idea into a whole one. A founders panel is your chance to ask the question you’ve been sitting on.',
      'A big thank you to Grayfel Technologies Inc. for sponsoring the prize and giving students one more reason to get involved.',
    ],
    facts: [['Prize', '$200 cash'], ['Sponsor', 'Grayfel Technologies Inc.'], ['Who can play', 'Any student at our events, competing or not'], ['The draw', GRAND_FINALE]],
    actions: [{ label: 'See upcoming events', to: '/events#upcoming' }, { label: 'Join our Discord', href: SITE.discordUrl }],
    featured: true,
    published: true,
  },
  {
    // The owner's notice. The amount is the third place prize listed on Compete; the Centre is a year one partner (partners.ts).
    slug: 'third-place-prize',
    title: 'The Small Business and Entrepreneurship Centre sponsors our third place prize',
    date: '2026-10-28',
    excerpt: 'The $500 third place cash prize at this year’s Campus Grand Finale is sponsored by the Small Business and Entrepreneurship Centre.',
    art: { kind: 'note', paper: 'index', what: 'Third place prize', amount: '$500', thanks: 'Thank you, Small Business Centre!' },
    body: [
      'We’re happy to share that the Small Business and Entrepreneurship Centre is sponsoring this year’s third place cash prize. The team that places third at the Campus Grand Finale on February 4, 2027 takes home $500.',
      'The Centre helps entrepreneurs across Windsor-Essex launch and grow their businesses. It also backed our first season, and we’re glad to have it in our corner again.',
      'The top three teams at the Grand Finale win $2,000, $1,000 and $500. To be one of them, register your team by November 20.',
      'Thank you to the Small Business and Entrepreneurship Centre for supporting student founders in Windsor.',
    ],
    facts: [['Prize', '$500 for third place'], ['Sponsor', 'Small Business and Entrepreneurship Centre'], ['Awarded at', GRAND_FINALE]],
    actions: ['register', { label: 'How to compete', to: '/compete' }],
    published: true,
  },
  {
    // The owner's notice. How the audience votes isn't settled yet, so the post leaves it for later.
    slug: 'peoples-choice-award',
    title: 'Offshoot Initiative sponsors a $500 People’s Choice Award',
    date: '2026-10-28',
    excerpt: 'At this year’s Campus Grand Finale, the audience gets a say. Offshoot Initiative is sponsoring a $500 People’s Choice Award for the crowd’s favourite team.',
    art: { kind: 'note', paper: 'legal', what: 'People’s Choice Award', amount: '$500', thanks: 'Thank you, Offshoot Initiative!' },
    body: [
      'At this year’s Campus Grand Finale, the judges won’t be the only ones picking a winner. Offshoot Initiative is sponsoring our People’s Choice Award, and the team the audience picks takes home $500.',
      'So if you’re coming to watch on February 4, 2027, come ready to cheer for your favourite. We’ll share how voting works closer to the night.',
      'For teams, it’s one more prize to play for, alongside the $2,000, $1,000 and $500 for the top three. Win over the room and it could be yours.',
      'Thank you to Offshoot Initiative for backing student founders and for giving the audience a voice on the night.',
    ],
    facts: [['Prize', '$500'], ['Sponsor', 'Offshoot Initiative'], ['Chosen by', 'The Grand Finale audience'], ['Awarded at', GRAND_FINALE]],
    actions: [{ label: 'Save your seat at the Grand Finale', to: '/events/campus-grand-finale' }, { label: 'How to compete', to: '/compete' }],
    published: true,
  },
  {
    // Written from the Year One page (SeasonMilestones.tsx, copy.json), UWindsor News ("Students turn fish waste into
    // winning business idea", February 13, 2026: the date, the placings and who came) and the approved year one photos.
    slug: 'first-grand-finale',
    title: 'Looking back at our first Campus Grand Finale',
    date: '2026-10-28',
    excerpt: 'Six teams, one stage and a room full of supporters. Here’s how Windsor’s first Campus Grand Finale went, and where it took two of our teams.',
    art: { kind: 'photos', front: 'year-one-0653', back: 'team-pitch', caption: 'Our first Grand Finale' },
    body: [
      'On February 5, Hult Prize UWindsor held its first-ever Campus Grand Finale in the University of Windsor’s Alumni Auditorium. It was the last stop of a season we built from scratch.',
      'Fourteen student startups signed up for our first campus round, and six made it all the way to the Grand Finale stage. Each team had four minutes to pitch its business to judges from Windsor’s business community, then took their questions.',
      'The room was behind every one of them. Students, academic leaders, industry professionals and community partners filled the tables, took notes and cheered each team on.',
      { heading: 'The results' },
      '100% Fish took first place with a plan to turn discarded Lake Erie fish byproducts into premium, nutritious dog treats. Mycovolt came second with an idea to make sustainable batteries from mushroom waste, and Novafloat placed third with a concept to help small businesses access capital.',
      'Then came the trophies, the Hult Prize T-shirts and plenty of photos onstage.',
      { heading: 'Where it led' },
      'Two of our teams, Mycovolt and 100% Fish, went on to the Canadian National Championships at McGill University in Montreal. 100% Fish finished in Canada’s top eight, and both ventures are still running in Windsor today.',
      'The season got noticed, too: the Hult Prize Foundation named UWindsor the Best Program in North America.',
      'None of it would have happened without the ten partners who funded our first season, the judges who gave their time, and every student who came to pitch or to cheer.',
      { heading: 'This year’s Grand Finale' },
      'Our second Campus Grand Finale is on February 4, 2027, and we’re aiming for at least ten teams on stage. The top three win $2,000, $1,000 and $500, and the audience picks a $500 People’s Choice winner.',
      'Want your team up there? Register by November 20. Just want to watch? Save your seat and come cheer.',
    ],
    facts: [['Date', 'February 5, 2026'], ['Startups registered', '14'], ['Teams at the Grand Finale', '6'], ['First place', '100% Fish'], ['Second and third', 'Mycovolt and Novafloat'], ['At Nationals', '100% Fish placed in Canada’s top eight'], ['Next Grand Finale', 'February 4, 2027']],
    actions: ['register', { label: 'Save your seat at the Grand Finale', to: '/events/campus-grand-finale' }, { label: 'See year one in pictures', to: '/year-one' }],
    published: true,
  },
  {
    // Written from the launch post (posts.ts), the Fusion partner page and what the launch photos show. The thank-you
    // names no one: the draft story (docs/fusion-story-draft.txt) asks to confirm who to thank first.
    slug: 'fusion-launch-day',
    title: 'Fusion launch day: our first event of the season',
    date: '2026-10-01',
    excerpt: 'Fusion opened on the second floor of the Joyce Entrepreneurship Centre, and Hult Prize UWindsor got a home of its own. Here’s how launch day went.',
    art: { kind: 'photos', front: 'launch-1822', back: 'launch-1849', caption: 'Launch day at Fusion' },
    body: [
      'On October 1, Fusion opened its doors on the second floor of the Joyce Entrepreneurship Centre, and Hult Prize UWindsor moved in. Launch day was our first event of the season, and our first chance to show people around our new headquarters.',
      'Fusion is the University of Windsor’s Innovation and Entrepreneurship Network. For us, it’s home base: a place where teams can work on their businesses, run into other students building things, and come to workshops and events all year.',
      'It was a busy afternoon. There were balloons, goodie bags, Hult Prize totes and a table covered in Fusion stickers, lanyards and pens. Partners had booths around the room, and there was even a robotics demo.',
      'At the Hult Prize table, students took on Real or Fake, our game, for the chance to win a prize. Others stopped by to sign up for this year’s competition, and we handed out flyers with some news from year one: the Hult Prize Foundation named UWindsor the Best Program in North America.',
      'Thank you to the team at Fusion for giving us a home, and to everyone who came out to celebrate with us.',
      'Missed it? Fusion is open Monday to Friday, so come and find us. Registration for this year’s competition closes November 20.',
    ],
    facts: [['Event', 'Fusion launch day, October 1, 2026'], ['Where', 'Fusion, Joyce Entrepreneurship Centre, second floor']],
    actions: [{ label: 'Find Fusion', to: '/contact#come-and-find-us' }, 'register'],
    gallery: 'launch-day',
    event: 'fusion-launch',
    published: true,
  },
]

// Newest first; on the same day, the featured post first, then in the order above.
export function publishedBlogPosts() {
  return BLOG_POSTS.filter(post => post.published).sort((a, b) => b.date.localeCompare(a.date) || Number(!!b.featured) - Number(!!a.featured))
}

export const findBlogPost = (slug?: string) => publishedBlogPosts().find(post => post.slug === slug)
export const blogStoryForEvent = (event: string) => publishedBlogPosts().find(post => post.event === event)
