import { RevealText, RollingLabel } from '../components/MotionText'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publishedPosts, formatPostDate, postStatus, type Post } from '../data/posts'
import { Copy, PageHeader, RegisterButton, Section } from '../components/PageParts'

function PostCover({ post }: { post: Post }) {
  const visual = post.cover ?? post.flyer
  if (visual) return <figure className={`post-cover${post.flyer && !post.cover ? ' post-cover--flyer' : ''}`}><img src={visual.src} alt={visual.alt} /></figure>
  const date = new Date(`${post.date}T12:00:00`)
  return <div className="post-cover post-cover--date" aria-hidden="true"><span>Hult Prize · UWindsor</span><div><strong>{date.getDate()}</strong><span>{date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</span></div><span>Campus competition</span></div>
}
function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <article className={`post-card ${featured ? 'post-card--featured' : ''}`}><Link to={`/events/${post.slug}`} tabIndex={-1} aria-hidden="true"><PostCover post={post} /></Link><div className="post-card__body"><p className="post-meta"><span>{postStatus(post)}</span><time dateTime={post.date}>{formatPostDate(post.date)}</time></p><h2 data-text-reveal><Link to={`/events/${post.slug}`}><RevealText>{post.title}</RevealText></Link></h2><p>{post.excerpt}</p><Link className="text-link" to={`/events/${post.slug}`}>Read {post.category === 'Story' ? 'story' : 'details'} →</Link></div></article>
}
export default function EventsPage() {
  const [filter, setFilter] = useState('All')
  const posts = publishedPosts()
  const shown = posts.filter(p => filter === 'All' || postStatus(p) === (filter === 'Stories' ? 'Story' : 'Upcoming'))
  const featured = shown.find(p => p.featured) ?? shown[0]
  return <div className="events-page"><PageHeader title="Events" subtitle="Workshops, campus events and competition deadlines." /><Section>
    {posts.length >= 6 && <div className="event-filters" role="group" aria-label="Filter posts">{['All', 'Upcoming', 'Stories'].map(label => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>}
    {featured && <PostCard post={featured} featured />}
    <div className="post-grid">{shown.filter(p => p !== featured).map(p => <PostCard key={p.slug} post={p} />)}</div>
    {!shown.length && <p>No posts in this category yet.</p>}
    <div className="page-next"><div><h2 data-text-reveal><RevealText>The season at a glance</RevealText></h2><p>From the October launch to Nationals in April.</p></div><Link className="btn btn--secondary" to="/this-year#calendar"><RollingLabel>View the full calendar</RollingLabel><span aria-hidden="true">→</span></Link></div>
  </Section></div>
}
export function EventPostPage() {
  const { slug } = useParams()
  const post = publishedPosts().find(p => p.slug === slug)
  if (!post) return <NotFoundPage />
  return <div className="event-page"><PageHeader title={post.title} subtitle={post.excerpt} /><Section>
    <Link className="text-link event-back" to="/events">← All events and stories</Link>
    <div className="event-article-layout">
      <article className="event-article" aria-label={post.title}>
        <h2 data-text-reveal><RevealText>{post.flyer ? 'What to expect' : 'Before you register'}</RevealText></h2>
        <Copy paragraphs={post.body} />
        {post.cover && <figure className="post-detail-cover"><img src={post.cover.src} alt={post.cover.alt} /><figcaption>{post.cover.caption}</figcaption></figure>}
        {post.flyer && <figure className="post-flyer"><img src={post.flyer.src} alt={post.flyer.alt} width={post.flyer.width} height={post.flyer.height} /><figcaption><a className="text-link" href={post.flyer.download} download>Download the flyer (PNG)</a></figcaption></figure>}
      </article>
      <aside className="event-details" aria-labelledby="event-details-title"><p className="eyebrow">{postStatus(post)}</p><h2 id="event-details-title" data-text-reveal><RevealText>Event details</RevealText></h2><dl><div><dt>Date</dt><dd><time dateTime={post.date}>{formatPostDate(post.date)}</time></dd></div>{post.location && <div><dt>{post.flyer ? 'Visit' : 'Entry'}</dt><dd>{post.location}</dd></div>}</dl>
        {post.flyer ? <><p>The launch welcomes students from every institution. Drop in; no event registration needed.</p><Link className="btn btn--secondary" to="/contact#come-and-find-us"><RollingLabel>Find Fusion</RollingLabel><span aria-hidden="true">→</span></Link></> : <><p>Complete the official Hult Prize form to enter your team.</p><RegisterButton /></>}
        <Link className="text-link" to="/compete">How to enter the competition <span aria-hidden="true">→</span></Link>
      </aside>
    </div>
  </Section></div>
}
export function NotFoundPage() {
  return <div className="not-found-page"><PageHeader title="Page not found" subtitle="This link may have changed. Find your next step below." /><Section><div className="recovery-links">{[['/', 'Home', 'Start with the competition overview.'], ['/compete', 'Compete', 'Eligibility, registration and team matching.'], ['/this-year#calendar', 'The calendar', 'See the dates for this season.'], ['/contact', 'Contact the team', 'Ask a question or plan a visit.']].map(([to, title, text]) => <Link key={to} to={to}><h2 data-text-reveal><RevealText>{title}</RevealText> <span aria-hidden="true">→</span></h2><p>{text}</p></Link>)}</div></Section></div>
}
