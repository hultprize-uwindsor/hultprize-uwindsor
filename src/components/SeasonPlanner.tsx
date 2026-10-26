import { useState } from 'react'
import { Link } from './PageLink'
import { SITE } from '../data/site'
import { DEVFEST } from '../data/posts'
import { eventTime, localDay, useAttendanceEvents, type AttendanceEvent } from '../lib/attendance'
import './eventMarks.css'
import './SeasonPlanner.css'

type Group = AttendanceEvent['group'] | 'deadline' | 'milestone'
type Item = { id: string; title: string; day: string; endDay?: string; group: Group; detail: string; link?: { to: string; label: string; external?: boolean; keep?: boolean }; past: boolean }

const FILTERS: [label: string, groups: Group[]][] = [['All', []], ['Workshops', ['workshops']], ['Community', ['community']], ['Grand Finale', ['finale']], ['Key dates', ['deadline', 'milestone']]]
const format = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${day}T12:00:00Z`))

/**
 * The whole season by month: the launch, every attendance event from the live schedule, DevFest (where we have a
 * booth), and the key dates that are booked elsewhere (the team registration deadline, UWill Discover and Nationals).
 */
export default function SeasonPlanner() {
  const { events } = useAttendanceEvents()
  const [now] = useState(() => Date.now())
  const [filter, setFilter] = useState(0)
  const today = localDay(now)
  const items: Item[] = [
    { id: 'fusion-launch', title: 'Fusion x Hult HQ launch', day: '2026-10-01', group: 'community' as const, detail: '2:00 p.m.-4:00 p.m. · Joyce Entrepreneurship Centre', link: { to: '/events/fusion-launch', label: 'Read about launch day', keep: true }, past: '2026-10-01' < today },
    ...events.filter(event => event.status !== 'cancelled').map(event => ({
      id: event.id, title: event.title, day: localDay(event.startsAt, event.timeZone), group: event.group,
      detail: `${eventTime(event)} · ${event.venue.split(',')[0]}`,
      link: { to: `/attend?events=${encodeURIComponent(event.id)}`, label: 'Details and registration' },
      past: new Date(event.endsAt).getTime() <= now,
    })),
    { id: DEVFEST.slug, title: DEVFEST.title, day: DEVFEST.day, group: 'community' as const, detail: `${DEVFEST.time} · ${DEVFEST.venue} · Our booth and keynote`, link: { to: `/events/${DEVFEST.slug}`, label: 'Details and registration' }, past: DEVFEST.day < today },
    { id: 'team-registration', title: 'Team registration closes', day: SITE.registrationClosesOn, group: 'deadline' as const, detail: 'The only registration that counts toward the competition', link: { to: SITE.registrationUrl, label: 'Register your team', external: true }, past: SITE.registrationClosesOn < today },
    { id: 'uwill-discover', title: 'UWill Discover Conference pitch', day: '2027-03-13', group: 'milestone' as const, detail: 'Pitch your startup at the UWill Discover Conference', past: '2027-03-13' < today },
    { id: 'nationals', title: 'Nationals', day: '2027-04-10', endDay: '2027-04-11', group: 'milestone' as const, detail: 'Calgary · up to three UWindsor teams', past: '2027-04-11' < today },
  ].sort((a, b) => a.day.localeCompare(b.day))
  const nextId = items.find(item => !item.past)?.id
  const groups = FILTERS[filter][1]
  const shown = items.filter(item => !groups.length || groups.includes(item.group))
  const months = [...new Set(shown.map(item => item.day.slice(0, 7)))]

  return <div className="season-planner">
    <div className="mark-filters" role="group" aria-label="Show events">{FILTERS.map(([label, filterGroups], index) => <button key={label} type="button" className={filterGroups.length ? `mark--${filterGroups[0]}` : undefined} aria-pressed={filter === index} onClick={() => setFilter(index)}>{label}</button>)}</div>
    <p className="planner-note">All times are local Windsor time (America/Toronto).</p>
    {months.map(month => <section key={month} className="planner-month" aria-labelledby={`planner-${month}`}>
      <h3 id={`planner-${month}`}>{format(`${month}-01`, { month: 'long' })} <span>{month.slice(0, 4)}</span></h3>
      <ol className="planner-month__items">{shown.filter(item => item.day.startsWith(month)).map(item => <li key={item.id} className={`planner-item mark--${item.group}${item.past ? ' is-past' : ''}${item.group === 'deadline' || item.group === 'milestone' ? ' is-key-date' : ''}`}>
        <span className="date-badge" aria-hidden="true"><span>{format(item.day, { month: 'short' })}</span><strong>{Number(item.day.slice(8))}{item.endDay ? `-${Number(item.endDay.slice(8))}` : ''}</strong></span>
        <div className="planner-item__body">
          {item.id === nextId && <p className="planner-next">Next up</p>}
          <h4>{item.title}</h4>
          <p className="planner-item__when">{format(item.day, { weekday: 'long', month: 'long', day: 'numeric' })}{item.endDay ? ` to ${format(item.endDay, { weekday: 'long', month: 'long', day: 'numeric' })}` : ''}</p>
          <p>{item.detail}</p>
          {item.past && <p className="planner-done">Done ✓</p>}
          {item.link && (!item.past || item.link.keep) && (item.link.external
            ? <a className="planner-link" href={item.link.to} target="_blank" rel="noopener noreferrer">{item.link.label} <span aria-hidden="true">↗</span></a>
            : <Link className="planner-link" to={item.link.to}>{item.link.label} <span aria-hidden="true">→</span></Link>)}
        </div>
      </li>)}</ol>
    </section>)}
    <p className="planner-closing"><strong>Competition registration closes November 20, 2026.</strong> <a href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">Register your team separately</a>. UWill Discover and Nationals have their own registration, and mentoring and prototype sessions are booked separately.</p>
  </div>
}
