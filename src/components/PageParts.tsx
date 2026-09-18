import EventTimeline from './EventTimeline'
import CountUpText from './CountUpText'
import type { ReactNode } from 'react'
import { SITE } from '../data/site'

export function RegisterButton({ children = 'Register your team' }: { children?: ReactNode }) {
  return <a className="btn btn--primary" href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true">↗</span></a>
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="page-heading container"><p className="eyebrow">Hult Prize at the University of Windsor</p><h1>{title}</h1><p>{subtitle}</p></header>
}

export function Section({ eyebrow, title, children, tint = '', id }: { eyebrow?: string; title?: string; children: ReactNode; tint?: string; id?: string }) {
  return <section className={`section chapter-section ${tint}`} id={id}><div className="container">{eyebrow && <p className="eyebrow">{eyebrow}</p>}{title && <h2>{title}</h2>}{children}</div></section>
}

export function Copy({ paragraphs }: { paragraphs: string[] }) {
  return <div className="prose">{paragraphs.map(p => <p key={p}>{p}</p>)}</div>
}

const homeStats = [['14', 'student startups in year one'], ['6', 'pitched at the Grand Finale'], ['Top 8', 'in Canada at Nationals'], ['Best in North America', 'Hult Prize Foundation, 2026']]
export function Stats({ items = homeStats, animate = true }: { items?: string[][]; animate?: boolean }) {
  return <div className="stat-band" style={{ '--stat-count': items.length } as React.CSSProperties}>{items.map(([value, label]) => <div key={label}><strong className={value.length > 16 ? 'stat-long' : ''}>{animate ? <CountUpText value={value} /> : value}</strong><span>{label}</span></div>)}</div>
}

const calendar = [
  ['September and October', 'Launch, information sessions, founder panel, course integration'],
  ['Week of October 26', 'Brand and pitch bootcamp begins, run with Sterling Cybersecurity and Advisory Group'],
  ['November', 'Team mixer, bootcamp continues to November 30'],
  ['November 20', 'Registration closes'],
  ['January', 'Checkpoints, mentor matching, mock pitch rounds'],
  ['February 5, 2027', 'Grand Finale'],
  ['April 2027', 'Canadian National Championships'],
]
export function Timeline({ compact = false }: { compact?: boolean }) {
  const items = compact ? [['October 1', 'Fusion x Hult HQ launch'], ['October 26', 'Brand and pitch bootcamp begins'], ['November 20', 'Registration closes'], ['February 5', 'Grand Finale'], ['April 2027', 'National Championships']] : calendar
  if (compact) return <EventTimeline items={items} />
  return <ol className={`timeline ${compact ? '' : 'timeline--full'}`}>{items.map(([date, description]) => <li key={date}><strong>{date}</strong><p>{description}</p></li>)}</ol>
}

export function CTABand({ text = 'Registration closes November 20.' }: { text?: string }) {
  return <section className="cta-band"><div className="container"><h2>{text}</h2><RegisterButton /></div></section>
}
