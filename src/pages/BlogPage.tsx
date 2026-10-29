import { useId } from 'react'
import { useParams } from 'react-router-dom'
import LaunchGallery from '../components/LaunchGallery'
import { RevealText, RollingLabel } from '../components/MotionText'
import { Link } from '../components/PageLink'
import { PageLayout, RegisterButton, Section } from '../components/PageParts'
import RaffleTickets from '../components/RaffleTickets'
import { HOME_BOARD_PHOTOS, LAUNCH_DAY_GALLERY } from '../data/assets'
import { findBlogPost, publishedBlogPosts, type BlogAction, type BlogArt, type BlogBlock, type BlogPost } from '../data/blog'
import { formatPostDate } from '../data/posts'
import { NotFoundPage } from './EventsPage'
import './BlogPage.css'

/** One of the approved board photos (year one or launch day) as a taped Polaroid. */
function Polaroid({ name, caption, className }: { name: string; caption?: string; className: string }) {
  const photo = HOME_BOARD_PHOTOS.find(item => item.name === name)
  if (!photo) return null
  return <span className={`post-art__polaroid ${className}`}><span className="tape" /><img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 700px) 60vw, 360px" alt="" loading="lazy" />{caption && <span className="post-art__caption">{caption}</span>}</span>
}

/** A loop of marker drawn round the prize in two strokes: the loop, then its overshoot back across the start, darker
    where the two cross. The filter roughens the edge as felt does on paper. */
function MarkerCircle() {
  const filter = `marker-${useId().replace(/[^\w-]/g, '')}`
  return <svg className="post-art__circle" viewBox="0 0 200 100" preserveAspectRatio="none">
    <filter id={filter} x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="2.4" xChannelSelector="R" yChannelSelector="G" /></filter>
    <path filter={`url(#${filter})`} d="M152 12C112 1 40 6 15 30-3 48 11 80 60 90c48 9 112 2 129-24 14-21-2-46-41-53" />
    <path filter={`url(#${filter})`} d="M148 13C120 7 88 8 58 19" />
  </svg>
}

/** A post's picture, drawn in its own paper: taped Polaroids for a story, a typed note with the prize circled in marker
    for a sponsor notice, and a strip of raffle tickets for the minigame. Decorative: the headline and the facts say the
    same in words. */
function PostArt({ art }: { art: BlogArt }) {
  if (art.kind === 'photos') return <span className="post-art post-art--photos" aria-hidden="true">
    <Polaroid name={art.back} className="post-art__polaroid--back" />
    <Polaroid name={art.front} caption={art.caption} className="post-art__polaroid--front" />
  </span>
  if (art.kind === 'note') return <span className={`post-art post-art--note post-art--${art.paper}`} aria-hidden="true"><span className="post-art__note">
    <span className="tape" />
    <span className="post-art__what">{art.what}</span>
    <span className="post-art__amount">{art.amount}<MarkerCircle /></span>
    <span className="post-art__thanks">{art.thanks}</span>
  </span></span>
  return <RaffleTickets game={art.game} prize={art.prize} draw={art.draw} />
}

/** A post on the blog's front page: its picture, headline, date and summary, then a link to read it. */
function BlogCard({ post, lead }: { post: BlogPost; lead?: boolean }) {
  const to = `/blog/${post.slug}`
  return <article className={`blog-card${lead ? ' blog-card--lead' : ''}`}>
    <Link className="blog-card__art" to={to} tabIndex={-1} aria-hidden="true"><PostArt art={post.art} /></Link>
    <div className="blog-card__text">
      {lead ? <h2 className="blog-card__title"><Link to={to}>{post.title}</Link></h2> : <h3 className="blog-card__title"><Link to={to}>{post.title}</Link></h3>}
      <p className="blog-card__date"><time dateTime={post.date}>{formatPostDate(post.date)}</time></p>
      <p className="blog-card__summary">{post.excerpt}</p>
      <Link className="text-link blog-card__more" to={to}>Read the post <span aria-hidden="true">→</span><span className="visually-hidden">: {post.title}</span></Link>
    </div>
  </article>
}

/** The blog: the latest post leads, every other post follows as a card. */
export default function BlogPage() {
  const [lead, ...rest] = publishedBlogPosts()
  return <PageLayout className="blog-page" title="Blog" subtitle="News, notices and stories from Hult Prize at UWindsor.">
    <Section>
      {lead && <BlogCard post={lead} lead />}
      {rest.length > 0 && <><h2 className="visually-hidden">More posts</h2><div className="blog-cards">{rest.map(post => <BlogCard key={post.slug} post={post} />)}</div></>}
    </Section>
  </PageLayout>
}

/** A post's body: paragraphs, subheadings and numbered steps. */
function BlogBody({ blocks }: { blocks: BlogBlock[] }) {
  return <div className="prose blog-article__body">{blocks.map((block, i) => typeof block === 'string' ? <p key={i}>{block}</p>
    : 'heading' in block ? <h2 key={i}>{block.heading}</h2>
    : <ol key={i} className="blog-steps">{block.steps.map(step => <li key={step}>{step}</li>)}</ol>)}</div>
}

function Action({ action, primary }: { action: BlogAction; primary: boolean }) {
  if (action === 'register') return <RegisterButton />
  const className = `btn ${primary ? 'btn--primary' : 'btn--secondary'}`
  if ('href' in action) return <a className={className} href={action.href} target="_blank" rel="noopener noreferrer"><RollingLabel>{action.label}</RollingLabel><span aria-hidden="true">↗</span></a>
  return <Link className={className} to={action.to}><RollingLabel>{action.label}</RollingLabel><span aria-hidden="true">→</span></Link>
}

export function BlogPostPage() {
  const { slug } = useParams()
  const post = findBlogPost(slug)
  if (!post) return <NotFoundPage />
  const more = publishedBlogPosts().filter(other => other.slug !== post.slug).slice(0, 3)
  return <PageLayout className="blog-post-page" title={post.title} subtitle={post.excerpt}><Section>
    <Link className="text-link blog-back" to="/blog">← All posts</Link>
    <div className="blog-post">
      <article className="blog-article" aria-label={post.title}>
        <BlogBody blocks={post.body} />
        {post.actions && <div className="blog-article__actions">{post.actions.map((action, i) => <Action key={i} action={action} primary={i === 0} />)}</div>}
      </article>
      <div className="blog-post__art"><PostArt art={post.art} /></div>
      <aside className="blog-post__facts" aria-label="About this post">
        <dl>
          <div><dt>Posted</dt><dd><time dateTime={post.date}>{formatPostDate(post.date)}</time></dd></div>
          {post.facts?.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </aside>
    </div>
    {post.gallery === 'launch-day' && LAUNCH_DAY_GALLERY.length > 0 && <div className="blog-recap"><h2 data-text-reveal><RevealText>Launch day in pictures</RevealText></h2><LaunchGallery /></div>}
    {more.length > 0 && <div className="blog-more">
      <h2 data-text-reveal><RevealText>More from the blog</RevealText></h2>
      <div className="blog-cards">{more.map(other => <BlogCard key={other.slug} post={other} />)}</div>
    </div>}
  </Section></PageLayout>
}
