import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from './PageLink'
import { HOME_BOARD_PHOTOS } from '../data/assets'
import { SITE } from '../data/site'
import { DEVFEST } from '../data/posts'
import { eventTime, localDay, useAttendanceEvents, type AttendanceEvent } from '../lib/attendance'
import './eventMarks.css'
import './WallCalendar.css'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
// Each month's page is headed by a board photo, shown whole at its own shape (launch photos are 3:2, year-one
// photos 5:4); a month without one gets a plain band.
const MONTH_PHOTOS: Record<string, [name: string, width: number, height: number]> = { '2026-10': ['launch-1810', 720, 480], '2026-11': ['team-pitch', 720, 576], '2026-12': ['year-one-0125', 720, 576], '2027-01': ['launch-1849', 720, 480], '2027-02': ['teams-onstage', 720, 576] }
const LEGEND = [['workshops', 'Workshop'], ['community', 'Community event'], ['finale', 'Grand Finale'], ['deadline', 'Deadline']]

type Mark = { id: string; title: string; day: string; group: AttendanceEvent['group'] | 'deadline'; to: string; external?: boolean; detail: string; past: boolean }

const noon = (day: string) => new Date(`${day}T12:00:00Z`)
const format = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(noon(day))
const addMonths = (month: string, step: number) => {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, index - 1 + step, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * A paper wall calendar taped up at its corners, with event days circled in marker, and a notepad of what's coming up.
 * Both are returned side by side so the homepage section can place them in its own grid.
 */
export default function WallCalendar() {
  const { events } = useAttendanceEvents()
  const [now] = useState(() => Date.now())
  const [chosenMonth, setChosenMonth] = useState<string | null>(null)
  const [flips, setFlips] = useState(0)
  const [active, setActive] = useState<string | null>(null)
  const today = localDay(now)
  const marks: Mark[] = [
    ...events.filter(event => event.status !== 'cancelled').map(event => {
      const day = localDay(event.startsAt, event.timeZone)
      return { id: event.id, title: event.title.split(':')[0], day, group: event.group, to: `/attend?events=${encodeURIComponent(event.id)}`, detail: `${format(day, { weekday: 'short' })} · ${eventTime(event)}`, past: new Date(event.endsAt).getTime() <= now }
    }),
    { id: DEVFEST.slug, title: 'Google DevFest', day: DEVFEST.day, group: 'community' as const, to: `/events/${DEVFEST.slug}`, detail: `${format(DEVFEST.day, { weekday: 'short' })} · ${DEVFEST.time}`, past: DEVFEST.day < today },
    { id: 'team-registration', title: 'Team registration closes', day: SITE.registrationClosesOn, group: 'deadline' as const, to: SITE.registrationUrl, external: true, detail: 'Register your team at hultprize.org', past: SITE.registrationClosesOn < today },
  ].sort((a, b) => a.day.localeCompare(b.day))
  const firstMonth = marks[0].day.slice(0, 7), lastMonth = marks[marks.length - 1].day.slice(0, 7)
  const month = chosenMonth ?? (marks.find(mark => !mark.past) ?? marks[marks.length - 1]).day.slice(0, 7)
  const turn = (step: number) => { setChosenMonth(addMonths(month, step)); setFlips(count => count + 1) }

  const [year, monthIndex] = month.split('-').map(Number)
  const cells: (number | null)[] = [...Array(new Date(Date.UTC(year, monthIndex - 1, 1)).getUTCDay()).fill(null), ...Array.from({ length: new Date(Date.UTC(year, monthIndex, 0)).getUTCDate() }, (_, index) => index + 1)]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))
  const [photoName, photoWidth, photoHeight] = MONTH_PHOTOS[month] ?? []
  const photo = HOME_BOARD_PHOTOS.find(item => item.name === photoName)
  const upcoming = [...marks.filter(mark => !mark.past && mark.group !== 'deadline').slice(0, 5), ...marks.filter(mark => !mark.past && mark.group === 'deadline')].sort((a, b) => a.day.localeCompare(b.day))

  const day = (date: number) => {
    const key = `${month}-${String(date).padStart(2, '0')}`
    const found = marks.filter(mark => mark.day === key)
    const className = ['calendar-day', key === today && 'is-today', found.length > 0 && `calendar-day--marked mark--${found[0].group}`, found.length > 0 && found.every(mark => mark.past) && 'is-past', found.some(mark => mark.id === active) && 'is-active'].filter(Boolean).join(' ')
    if (!found.length) return <span className={className}>{date}</span>
    const label = `${found.map(mark => mark.title).join(' and ')}, ${format(key, { weekday: 'long', month: 'long', day: 'numeric' })}`
    return found[0].external
      ? <a className={className} href={found[0].to} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>{date}</a>
      : <Link className={className} to={found[0].to} aria-label={label} title={label}>{date}</Link>
  }
  const highlight = (id: string | null) => ({ onMouseEnter: () => setActive(id), onMouseLeave: () => setActive(null), onFocus: () => setActive(id), onBlur: () => setActive(null) })

  return <>
    <div className="wall-calendar">
      <span className="tape tape--left" aria-hidden="true" /><span className="tape tape--right" aria-hidden="true" />
      <div className="wall-calendar__rings" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index} />)}</div>
      <div key={month} className={`wall-calendar__page${flips ? ' is-flipping' : ''}`}>
        {photo ? <img className="wall-calendar__photo" src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 760px) 92vw, 600px" width={photoWidth} height={photoHeight} alt="" loading="lazy" /> : <div className="wall-calendar__band" />}
        <div className="wall-calendar__head">
          <button type="button" className="wall-calendar__turn" onClick={() => turn(-1)} disabled={month <= firstMonth} aria-label="Previous month"><ChevronLeft aria-hidden="true" /></button>
          <h3 id="calendar-month" aria-live="polite">{format(`${month}-01`, { month: 'long' })} <span>{year}</span></h3>
          <button type="button" className="wall-calendar__turn" onClick={() => turn(1)} disabled={month >= lastMonth} aria-label="Next month"><ChevronRight aria-hidden="true" /></button>
        </div>
        <table className="calendar-grid" aria-labelledby="calendar-month">
          <thead><tr>{WEEKDAYS.map(name => <th key={name} scope="col"><span aria-hidden="true">{name[0]}</span><span className="visually-hidden">{name}</span></th>)}</tr></thead>
          <tbody>{weeks.map((week, index) => <tr key={index}>{week.map((date, column) => <td key={column}>{date && day(date)}</td>)}</tr>)}</tbody>
        </table>
        <ul className="calendar-legend">{LEGEND.map(([group, label]) => <li key={group} className={`mark-shape mark--${group}`}>{label}</li>)}</ul>
      </div>
    </div>
    <div className="calendar-notepad">
      <span className="tape" aria-hidden="true" />
      <h3>Coming up</h3>
      {upcoming.length ? <ol>{upcoming.map(mark => {
        const content = <><span className={`date-badge mark--${mark.group}`} aria-hidden="true"><span>{format(mark.day, { month: 'short' })}</span><strong>{Number(mark.day.slice(8))}</strong></span><span className="notepad-item__text"><strong>{mark.title}</strong><span>{mark.detail}</span></span><span className="notepad-item__arrow" aria-hidden="true">{mark.external ? '↗' : '→'}</span></>
        return <li key={mark.id}>{mark.external
          ? <a className="notepad-item" href={mark.to} target="_blank" rel="noopener noreferrer" {...highlight(mark.id)}>{content}</a>
          : <Link className="notepad-item" to={mark.to} {...highlight(mark.id)}>{content}</Link>}</li>
      })}</ol> : <p>That’s a wrap on this season’s events. See you next year!</p>}
      <Link className="notepad-more" to="/this-year#calendar">See the full calendar <span aria-hidden="true">→</span></Link>
    </div>
  </>
}
