import AttendanceCatalogue from '../components/AttendanceCatalogue'
import { canSelectEvent, downloadCalendar, eventDate, eventTime, eventStatusLabel, googleCalendarUrl, outlookCalendarUrl, GROUP_LABELS, localDay, useAttendanceEvents, type AttendanceEvent } from '../lib/attendance'
import LaunchGallery from '../components/LaunchGallery'
import { LAUNCH_DAY_GALLERY } from '../data/assets'
import { SITE } from '../data/site'
import { eventStructuredData } from '../data/eventSeo'
import '../components/eventMarks.css'
import './EventsPage.css'
import { RevealText, RollingLabel } from '../components/MotionText'
import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/PageLink'
import { publishedPosts, formatPostDate, postStatus, type Post } from '../data/posts'
import { blogStoryForEvent } from '../data/blog'
import { Copy, PageLayout, RegisterButton, Section } from '../components/PageParts'

type Story = {
  key: string
  title: string
  summary: string
  meta: string
  to: string
  day: string
  group?: AttendanceEvent['group']
  picture?: { src: string; srcSet?: string; alt: string; logo?: boolean }
  action?: ReactNode
  more?: string
}

const launchPicture = (name: string) => {
  const photo = LAUNCH_DAY_GALLERY.find(item => item.name === name)
  return photo && { src: photo.src, srcSet: photo.srcSet, alt: photo.alt }
}
// Pictures for the posts on this page; schedule events show their date instead.
const POST_PICTURES: Record<string, Story['picture']> = {
  'registration-closes-november-20': launchPicture('launch-1873'),
  'google-devfest': { src: '/images/events/devfest-2026-logo.webp', alt: 'GDG Windsor DevFest 2026', logo: true },
  'fusion-launch': launchPicture('launch-1822'),
}
const longDay = (day: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${day}T12:00:00Z`))
const dayPart = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${day}T12:00:00Z`))

function postStory(post: Post): Story {
  const upcoming = postStatus(post) === 'Upcoming'
  const host = post.hostRegistration
  return {
    key: post.slug, title: post.title, summary: post.excerpt, to: `/events/${post.slug}`, day: post.date, picture: POST_PICTURES[post.slug],
    meta: [longDay(post.date), post.location?.split(' · ')[0]].filter(Boolean).join(' · '),
    more: post.recap && !upcoming ? 'See the story and photos' : 'Read more',
    action: !upcoming ? undefined : post.cta === 'register' ? <RegisterButton /> : host ? <a className="btn btn--secondary" href={host.url} target="_blank" rel="noopener noreferrer"><RollingLabel>{`Register at ${host.site}`}</RollingLabel><span aria-hidden="true">↗</span></a> : undefined,
  }
}
function eventStory(event: AttendanceEvent): Story {
  const day = localDay(event.startsAt, event.timeZone)
  return { key: event.id, title: event.title, summary: event.description, to: `/events/${event.id}`, day, group: event.group, meta: `${longDay(day)} · ${eventTime(event)} · ${event.venue.split(',')[0]}` }
}

// Year one in brief, from what the site states elsewhere (the Year One page and the season summary).
const BRIEFS = [
  { title: 'UWindsor named Best Program in North America', text: 'The Hult Prize Foundation named UWindsor the Best Program in North America after our first season.', when: '2026', to: '/year-one' },
  { title: '100% Fish finishes in Canada’s top eight', text: '100% Fish finished in the top eight at the Canadian National Championships.', when: '2025-2026 season', to: '/year-one' },
  { title: 'Two UWindsor teams go to Nationals', text: 'Mycovolt and 100% Fish represented UWindsor at the Canadian National Championships at McGill University in Montreal.', when: '2025-2026 season', to: '/year-one' },
  { title: 'Six teams pitch at the first Grand Finale', text: 'Six of the fourteen startups that entered pitched to judges from Windsor’s business community.', when: '2025-2026 season', to: '/year-one' },
  { title: 'Ten partners back the first season', text: 'Ten partners contributed $8,000 to run the first campus round.', when: '2025-2026 season', to: '/partners' },
  { title: 'Hult Prize comes to Windsor', text: 'UWindsor joined Hult Prize for the 2025-2026 season, led by founding Campus Director Godswisdom Ogbonna.', when: '2025', to: '/year-one' },
]

/** A story's picture: its photo or logo, or for a schedule event, its date on the event's colour. */
function StoryPicture({ story, eager }: { story: Story; eager?: boolean }) {
  if (story.picture) return <img className={`story__picture${story.picture.logo ? ' story__picture--logo' : ''}`} src={story.picture.src} srcSet={story.picture.srcSet} sizes="(max-width: 700px) 92vw, (max-width: 1100px) 60vw, 720px" alt="" loading={eager ? 'eager' : 'lazy'} />
  return <span className={`story__date mark--${story.group ?? 'deadline'}`}><span>{dayPart(story.day, { month: 'long' })}</span><strong>{dayPart(story.day, { day: 'numeric' })}</strong><span>{dayPart(story.day, { weekday: 'long' })}</span></span>
}

/** A story as a news site lays it out: picture, headline, when and where, then (except at the side) its summary. A
    feature sets its picture beside the text and ends with a link to the full story. */
function StoryCard({ story, size }: { story: Story; size: 'lead' | 'side' | 'card' | 'feature' }) {
  return <article className={`story story--${size}`}>
    <Link className="story__media" to={story.to} tabIndex={-1} aria-hidden="true"><StoryPicture story={story} eager={size === 'lead'} /></Link>
    <div className="story__text">
      <h3 className="story__title"><Link to={story.to}>{story.title}</Link></h3>
      <p className="story__meta">{story.meta}</p>
      {size !== 'side' && <p className="story__summary">{story.summary}</p>}
      {size === 'lead' && story.action && <div className="story__action">{story.action}</div>}
      {size === 'feature' && <Link className="text-link story__more" to={story.to}>{story.more ?? 'Read more'} <span aria-hidden="true">→</span></Link>}
    </div>
  </article>
}

/** The events page as a news front page: top stories (the lead and the next things coming, beside a "Coming up" list
    from the live schedule), every upcoming event to register for, then what happened: recaps, past events and year
    one's news in brief. */
export default function EventsPage() {
  const [now] = useState(() => Date.now())
  const { events } = useAttendanceEvents()
  const posts = publishedPosts()
  const scheduled = events.filter(event => event.status !== 'cancelled')
  const upcomingEvents = scheduled.filter(event => new Date(event.endsAt).getTime() > now)
  const pastEvents = scheduled.filter(event => new Date(event.endsAt).getTime() <= now).reverse()
  const upcomingPosts = posts.filter(post => postStatus(post) === 'Upcoming').sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.date.localeCompare(b.date))
  const pastPosts = posts.filter(post => postStatus(post) === 'Past event')
  // Top stories look ahead: the featured post leads, the next two things coming sit beside it. (With nothing ahead,
  // the latest recap leads.)
  const ahead = [...upcomingPosts.map(postStory), ...upcomingEvents.map(eventStory)]
  const [lead = pastPosts[0] && postStory(pastPosts[0]), ...side] = ahead.slice(0, 3)
  const onFront = new Set([lead, ...side].map(story => story?.key))
  const comingUp = upcomingEvents.filter(event => !onFront.has(event.id)).slice(0, 5)
  // What happened looks back: recaps as features, then past schedule events.
  const recaps = pastPosts.filter(post => !onFront.has(post.slug)).map(postStory)
  const past = pastEvents.map(eventStory)
  return <PageLayout className="events-page" title="Events" subtitle="What’s coming up, what happened, and news from Hult Prize at UWindsor.">
    <Section>
      <h2 className="visually-hidden">Top stories</h2>
      <div className="news-front">
        {lead && <StoryCard story={lead} size="lead" />}
        {side.length > 0 && <div className="news-front__side">{side.map(story => <StoryCard key={story.key} story={story} size="side" />)}</div>}
        <aside className="news-rail" aria-labelledby="coming-up">
          <h3 className="news-rail__title" id="coming-up">Coming up</h3>
          <ol className="news-rail__list">{comingUp.map(event => <li key={event.id}><Link className={`news-rail__item mark--${event.group}`} to={`/events/${event.id}`}>
            <span className="date-badge" aria-hidden="true"><span>{badge(event, { month: 'short' })}</span><strong>{badge(event, { day: 'numeric' })}</strong></span>
            <span className="news-rail__headline">{event.title}</span>
            <span className="news-rail__when">{badge(event, { weekday: 'short' })} · {eventTime(event)}</span>
          </Link></li>)}</ol>
          {!comingUp.length && <p className="news-rail__empty">More events are on the way.</p>}
          <Link className="text-link" to="/this-year#calendar">The full calendar <span aria-hidden="true">→</span></Link>
        </aside>
      </div>
    </Section>
    <Section title="Upcoming events" id="upcoming"><AttendanceCatalogue /></Section>
    <Section title="What happened" id="what-happened" tint="paper-blue">
      {recaps.map(story => <StoryCard key={story.key} story={story} size="feature" />)}
      {past.length > 0 && <div className="news-cards">{past.map(story => <StoryCard key={story.key} story={story} size="card" />)}</div>}
      <h3 className="news-briefs__title">In brief</h3>
      <ul className="news-briefs">{BRIEFS.map(brief => <li key={brief.title}>
        <h4><Link to={brief.to}>{brief.title}</Link></h4>
        <p>{brief.text}</p>
        <p className="news-briefs__when">{brief.when}</p>
      </li>)}</ul>
    </Section>
  </PageLayout>
}
const badge = (event: AttendanceEvent, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${localDay(event.startsAt, event.timeZone)}T12:00:00Z`))

export function EventPostPage() {
  const { slug } = useParams()
  const { events } = useAttendanceEvents()
  const [now] = useState(() => Date.now())
  const event = events.find(item => item.id === slug)
  // The event's schema.org data, kept in step with the live schedule (the build writes the first version into the
  // page); taken away when leaving the event.
  useEffect(() => {
    if (!event) return
    let script = document.getElementById('event-structured-data')
    if (!script) { script = document.createElement('script'); script.id = 'event-structured-data'; script.setAttribute('type', 'application/ld+json'); document.head.append(script) }
    script.textContent = JSON.stringify(eventStructuredData(event, SITE.websiteUrl))
    return () => document.getElementById('event-structured-data')?.remove()
  }, [event])
  if (event) {
    const ended = new Date(event.endsAt).getTime() <= now
    const more = events.filter(item => item.id !== event.id && item.status !== 'cancelled' && new Date(item.endsAt).getTime() > now).slice(0, 3)
    return <PageLayout className="event-page" title={event.title} subtitle={event.description}><Section>
      <Link className="text-link" to="/events">← All events and stories</Link>
      <div className="event-detail">
        <div className={`event-detail__ticket mark--${event.group}`}>
          <time className="event-ticket__stub" dateTime={event.startsAt}>
            <span className="event-ticket__month">{badge(event, { month: 'short' })}</span>
            <span className="event-ticket__day">{badge(event, { day: 'numeric' })}</span>
            <span className="event-ticket__weekday">{badge(event, { weekday: 'short' })}</span>
            <span className="event-ticket__free">Free</span>
          </time>
          <div className="event-detail__info">
            <span className="event-ticket__group">{GROUP_LABELS[event.group]}</span>
            <dl>
              <div><dt>When</dt><dd>{eventDate(event)}<br />{eventTime(event)} (Windsor time)</dd></div>
              <div><dt>Where</dt><dd>{event.venue}</dd></div>
              <div><dt>Status</dt><dd>{eventStatusLabel(event)}</dd></div>
              <div><dt>Cost</dt><dd>Free · Drinks and snacks provided</dd></div>
            </dl>
            {event.preparation && <p className="event-detail__prep"><strong>Before you come:</strong> {event.preparation}</p>}
            <div className="event-detail__actions">
              <Link className="btn btn--primary" to={`/attend?events=${encodeURIComponent(event.id)}`}>{canSelectEvent(event) ? 'Register to attend' : 'View attendance options'}</Link>
            </div>
            {!ended && <div className="event-detail__calendar" role="group" aria-labelledby="event-calendar-label">
              <span id="event-calendar-label">Add to calendar</span>
              <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Google Calendar <span aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span></a>
              <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Outlook <span aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span></a>
              <button type="button" onClick={() => downloadCalendar(event)}>Apple / other (.ics) <span aria-hidden="true">↓</span></button>
            </div>}
            <p className="event-detail__note">Event attendance does not register your team for the competition. <Link to="/compete">Learn how to compete</Link>.</p>
          </div>
        </div>
        {more.length > 0 && <aside className="event-detail__more" aria-labelledby="more-events-title">
          <h2 id="more-events-title">More events</h2>
          <ul>{more.map(item => <li key={item.id}><Link className={`event-mini mark--${item.group}`} to={`/events/${item.id}`}>
            <span className="date-badge" aria-hidden="true"><span>{badge(item, { month: 'short' })}</span><strong>{badge(item, { day: 'numeric' })}</strong></span>
            <span><strong>{item.title}</strong><span>{eventDate(item, true)} · {eventTime(item)}</span></span>
          </Link></li>)}</ul>
          <Link className="text-link" to="/events">All events <span aria-hidden="true">→</span></Link>
        </aside>}
      </div>
    </Section></PageLayout>
  }
  const post = publishedPosts().find(p => p.slug === slug)
  if (!post) return <NotFoundPage />
  const past = postStatus(post) === 'Past event'
  const story = past ? blogStoryForEvent(post.slug) : undefined
  return <PageLayout className="event-page" title={post.title} subtitle={post.excerpt}><Section>
    <Link className="text-link event-back" to="/events">← All events and stories</Link>
    <div className="event-article-layout">
      <article className="event-article" aria-label={post.title}>
        <h2 data-text-reveal><RevealText>{post.flyer || post.hostRegistration ? (past ? 'What was on' : 'What to expect') : 'Before you register'}</RevealText></h2>
        <Copy paragraphs={post.body} />
        {post.cover && <figure className="post-detail-cover"><img src={post.cover.src} alt={post.cover.alt} /><figcaption>{post.cover.caption}</figcaption></figure>}
        {post.flyer && <p className="post-flyer-download"><a className="text-link" href={post.flyer.download} download>Download the flyer (PNG) <span aria-hidden="true">↓</span></a></p>}
        {story && <p className="post-flyer-download"><Link className="text-link" to={`/blog/${story.slug}`}>Read the story of the day on our blog <span aria-hidden="true">→</span></Link></p>}
      </article>
      <aside className="event-details" aria-labelledby="event-details-title"><h2 id="event-details-title" data-text-reveal><RevealText>Event details</RevealText></h2><dl><div><dt>Status</dt><dd>{postStatus(post)}</dd></div><div><dt>Date</dt><dd><time dateTime={post.date}>{formatPostDate(post.date)}</time></dd></div>{post.location && <div><dt>{post.flyer ? 'Visit' : post.hostRegistration ? 'Where' : 'Entry'}</dt><dd>{post.location}</dd></div>}</dl>
        {post.hostRegistration ? <><p>{past ? 'This event has passed. Come and find us at Fusion instead.' : 'This event has its own registration, separate from Hult Prize.'}</p>{!past && <a className="btn btn--primary" href={post.hostRegistration.url} target="_blank" rel="noopener noreferrer"><RollingLabel>{`Register at ${post.hostRegistration.site}`}</RollingLabel><span aria-hidden="true">↗</span></a>}</> : post.flyer ? <><p>{past ? 'Launch day has passed. Fusion is now our headquarters, so come and find us there.' : 'The launch welcomes students from every institution. Drop in; no event registration needed.'}</p><Link className="btn btn--secondary" to="/contact#come-and-find-us"><RollingLabel>Find Fusion</RollingLabel><span aria-hidden="true">→</span></Link></> : <><p>Complete the official Hult Prize form to enter your team.</p><RegisterButton /></>}
        <Link className="text-link" to="/compete">How to enter the competition <span aria-hidden="true">→</span></Link>
      </aside>
    </div>
    {past && post.recap === 'launch-day' && <div className="post-recap"><h2 data-text-reveal><RevealText>Launch day in pictures</RevealText></h2><LaunchGallery /></div>}
  </Section></PageLayout>
}
export function NotFoundPage() {
  return <PageLayout className="not-found-page" title="Page not found" subtitle="This link may have changed. Find your next step below."><Section><div className="recovery-links">{[['/', 'Home', 'Start with the competition overview.'], ['/compete', 'Compete', 'Eligibility, registration and team matching.'], ['/this-year#calendar', 'The calendar', 'See the dates for this season.'], ['/contact', 'Contact the team', 'Ask a question or plan a visit.']].map(([to, title, text]) => <Link key={to} to={to}><h2 data-text-reveal><RevealText>{title}</RevealText> <span aria-hidden="true">→</span></h2><p>{text}</p></Link>)}</div></Section></PageLayout>
}
