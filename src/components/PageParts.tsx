import EventTimeline from './EventTimeline'
import { HeroTitle, RevealText, RollingLabel } from './MotionText'
import type { ReactNode } from 'react'
import { SITE } from '../data/site'

export function RegisterButton({ children = 'Register your team' }: { children?: ReactNode }) {
  return <a className="btn btn--primary" href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">{typeof children === 'string' ? <RollingLabel>{children}</RollingLabel> : children}<span aria-hidden="true">↗</span></a>
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="page-heading"><div className="container"><div><p className="eyebrow">Hult Prize · UWindsor</p><HeroTitle>{title}</HeroTitle></div><p className="page-heading__intro">{subtitle}</p></div></header>
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

const calendar = [
  ['October 1, 2026', 'Fusion x Hult HQ launch'],
  ['November 7, 2026', 'Workshop series opens: five sessions through January 9, 2027'],
  ['November 20, 2026', 'Registration closes'],
  ['January 2, 2027', 'Touch base'],
  ['February 5, 2027', 'Grand Finale'],
  ['March 13, 2027', 'Uwill Discover Conference'],
  ['April 10–11, 2027', 'National Championships in Calgary'],
]
export function Timeline({ compact = false }: { compact?: boolean }) {
  const items = compact ? [calendar[0], ['November 7, 2026', 'Workshop series opens'], calendar[2], calendar[4], calendar[6]] : calendar
  if (compact) return <EventTimeline items={items} />
  return <ol className={`timeline ${compact ? '' : 'timeline--full'}`}>{items.map(([date, description]) => <li key={date}><strong>{date}</strong><p>{description}</p></li>)}</ol>
}

export function CTABand({ text = 'Registration closes November 20.', lede, className = '', children = <RegisterButton /> }: { text?: string; lede?: string; className?: string; children?: ReactNode }) {
  return <section className={`cta-band ${className}`}><div className="container"><div><h2 data-text-reveal><RevealText>{text}</RevealText></h2>{lede && <p className="cta-band__lede">{lede}</p>}</div>{children}</div></section>
}
