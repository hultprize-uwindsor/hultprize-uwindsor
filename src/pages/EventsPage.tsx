import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publishedPosts, formatPostDate, type Post } from '../data/posts'
import { Copy, PageHeader, RegisterButton, Section } from '../components/PageParts'

function PostCover({ post }: { post: Post }) {
  return post.cover ? <figure className="post-cover"><img src={post.cover.src} alt={post.cover.alt} /></figure> : <div className="post-cover post-cover--type" aria-hidden="true"><span>Hult Prize · UWindsor</span><strong>{post.title}</strong><span>2026 — 2027</span></div>
}
function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <article className={`post-card ${featured ? 'post-card--featured' : ''}`}><Link to={`/events/${post.slug}`} tabIndex={-1} aria-hidden="true"><PostCover post={post} /></Link><div className="post-card__body"><p className="post-meta"><span>{post.category}</span><time dateTime={post.date}>{formatPostDate(post.date)}</time></p><h2><Link to={`/events/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><Link className="text-link" to={`/events/${post.slug}`}>Read {post.category === 'Story' ? 'story' : 'details'} →</Link></div></article>
}
export default function EventsPage() {
  const [filter, setFilter] = useState('All')
  const posts = publishedPosts()
  const shown = posts.filter(p => filter === 'All' || p.category === (filter === 'Stories' ? 'Story' : 'Upcoming'))
  const featured = shown.find(p => p.featured) ?? shown[0]
  return <><PageHeader title="Events" subtitle="What is coming up, and what already happened." /><Section>
    {posts.length >= 6 && <div className="event-filters" role="group" aria-label="Filter posts">{['All', 'Upcoming', 'Stories'].map(label => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>}
    {featured && <PostCard post={featured} featured />}
    <div className="post-grid">{shown.filter(p => p !== featured).map(p => <PostCard key={p.slug} post={p} />)}</div>
    {!shown.length && <p>No posts in this category yet.</p>}
    <Link className="text-link" to="/this-year">See the full program calendar →</Link>
  </Section></>
}
export function EventPostPage() {
  const { slug } = useParams()
  const post = publishedPosts().find(p => p.slug === slug)
  if (!post) return <NotFoundPage />
  return <><PageHeader title={post.title} subtitle={post.excerpt} /><Section><p className="post-meta"><span>{post.category}</span><time dateTime={post.date}>{formatPostDate(post.date)}</time></p>{post.location && <p><strong>{post.location}</strong></p>}<div className="post-detail-cover"><PostCover post={post} /></div><Copy paragraphs={post.body} /><div className="button-row"><RegisterButton /><Link className="btn btn--secondary" to="/compete">How to enter</Link></div><Link className="text-link" to="/events">← All events and stories</Link></Section></>
}
export function NotFoundPage() {
  return <><PageHeader title="Page not found" subtitle="Let’s get you back to the program." /><Section><Link className="btn btn--secondary" to="/">Back to Home</Link></Section></>
}
