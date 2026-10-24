import EventTimeline from './EventTimeline'
import { HeroTitle, RevealText, RollingLabel } from './MotionText'
import type { ReactNode } from 'react'
import { SITE } from '../data/site'
import { Link } from './PageLink'
import { eventDate, eventTime, useAttendanceEvents } from '../lib/attendance'

export function RegisterButton({ children = 'Register your team' }: { children?: ReactNode }) {
  return <a className="btn btn--primary" href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">{typeof children === 'string' ? <RollingLabel>{children}</RollingLabel> : children}<span aria-hidden="true">↗</span></a>
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="page-heading"><div className="container"><div><p className="eyebrow">Hult Prize · UWindsor</p><HeroTitle>{title}</HeroTitle></div><p className="page-heading__intro">{subtitle}</p></div></header>
}

/** Shared frame keeps interior page sections inside a complete white sheet. */
export function PageLayout({ title, subtitle, className = '', children }: { title: string; subtitle: string; className?: string; children: ReactNode }) {
  return <div className={`interior-page ${className}`}><PageHeader title={title} subtitle={subtitle} /><div className="interior-content">{children}</div></div>
}

export function Section({ eyebrow, title, children, tint = '', id }: { eyebrow?: string; title?: string; children: ReactNode; tint?: string; id?: string }) {
  return <section className={`section chapter-section ${tint}`} id={id}><div className="container">{eyebrow && <p className="eyebrow">{eyebrow}</p>}{title && <h2 data-text-reveal><RevealText>{title}</RevealText></h2>}{children}</div></section>
}

export function Copy({ paragraphs }: { paragraphs: string[] }) {
  return <div className="prose">{paragraphs.map(p => <p key={p}>{p}</p>)}</div>
}

const homeStats = [['14', 'student startups in year one'], ['6', 'pitched at the Grand Finale'], ['2', 'teams at Nationals'], ['Best in North America', 'Hult Prize Foundation, 2026']]
// Final values only: the national stat band does not count up.
export function Stats({ items = homeStats, className = '' }: { items?: string[][]; className?: string }) {
  return <div className={`stat-band ${className}`} style={{ '--stat-count': items.length } as React.CSSProperties}>{items.map(([value, label]) => <div key={label}><strong className={value.length > 10 ? 'stat-long' : ''}>{value}</strong><span>{label}</span></div>)}</div>
}

export function Timeline({ compact = false }: { compact?: boolean }) {
  const { events, error } = useAttendanceEvents()
  const upcoming = events.filter(event => new Date(event.endsAt).getTime() > Date.now())
  const shown = compact ? upcoming.slice(0, 5) : events
  const items = shown.map(event => [eventDate(event, true), event.title, `/attend?events=${encodeURIComponent(event.id)}`, `${eventTime(event)} · ${event.venue}`])
  if (compact) return <div>{error && <p className="schedule-note">Schedule for reference; live registration is temporarily unavailable.</p>}<EventTimeline items={items} /><Link className="text-link" to="/attend">Attend our events →</Link></div>
  return <>{error && <p className="schedule-note">Schedule for reference; live registration is temporarily unavailable.</p>}<p>All times are local Windsor time (America/Toronto).</p><ol className="timeline timeline--full">{items.map(([date, description, to, detail]) => <li key={description}><strong>{date}</strong><div><p>{description}</p><span>{detail}</span><br /><Link className="text-link" to={to}>Event details and registration →</Link></div></li>)}</ol><p><strong>Competition registration closes November 20, 2026.</strong> <a href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">Register your team separately</a>.</p><p>UWill Discover, Nationals, mentoring and prototype sessions have separate schedules and booking processes.</p></>
}

export function CTABand({ text = 'Registration closes November 20.', lede, className = '', children = <RegisterButton /> }: { text?: string; lede?: string; className?: string; children?: ReactNode }) {
  return <section className={`cta-band ${className}`}><div className="container"><div><h2 data-text-reveal><RevealText>{text}</RevealText></h2>{lede && <p className="cta-band__lede">{lede}</p>}</div>{children}</div></section>
}
