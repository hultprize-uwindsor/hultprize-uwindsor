import { useState } from 'react'
import { Link } from './PageLink'
import { canSelectEvent, eventStatusLabel, eventTime, GROUP_LABELS, localDay, useAttendanceEvents, type AttendanceEvent } from '../lib/attendance'
import './eventMarks.css'
import './AttendanceCatalogue.css'

const FILTERS: [label: string, group?: AttendanceEvent['group']][] = [['All'], ['Workshops', 'workshops'], ['Community', 'community'], ['Grand Finale', 'finale']]
const stubPart = (event: AttendanceEvent, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${localDay(event.startsAt, event.timeZone)}T12:00:00Z`))

/** Every upcoming attendance event as an admission ticket, filterable by type, with the next one marked. (Past events are
    listed under "What happened" on the events page.) */
export default function AttendanceCatalogue() {
  const { events, error } = useAttendanceEvents()
  const [now] = useState(() => Date.now())
  const [filter, setFilter] = useState(0)
  const group = FILTERS[filter][1]
  const ended = (event: AttendanceEvent) => new Date(event.endsAt).getTime() <= now
  const upcoming = events.filter(event => !ended(event))
  const nextId = upcoming.find(event => event.status !== 'cancelled')?.id
  const shown = upcoming.filter(event => !group || event.group === group)
  return <div className="attendance-catalogue">
    <div className="attendance-catalogue__intro">
      <p>Free events for students across all faculties, sponsors and community guests. Drinks and snacks are provided. All times are local Windsor time.</p>
      <Link className="btn btn--primary" to="/attend">Attend our events <span aria-hidden="true">→</span></Link>
    </div>
    {error && <p className="schedule-note" role="status">Schedule for reference; live registration is temporarily unavailable.</p>}
    <div className="mark-filters" role="group" aria-label="Show events">{FILTERS.map(([label, filterGroup], index) => <button key={label} type="button" className={filterGroup ? `mark--${filterGroup}` : undefined} aria-pressed={filter === index} onClick={() => setFilter(index)}>{label}</button>)}</div>
    <ul className="event-tickets">{shown.map(event => <li key={event.id} className={`event-ticket mark--${event.group}`}>
      <div className="event-ticket__paper">
        <time className="event-ticket__stub" dateTime={event.startsAt}>
          <span className="event-ticket__month">{stubPart(event, { month: 'short' })}</span>
          <span className="event-ticket__day">{stubPart(event, { day: 'numeric' })}</span>
          <span className="event-ticket__weekday">{stubPart(event, { weekday: 'short' })}</span>
          <span className="event-ticket__free">Free</span>
        </time>
        <div className="event-ticket__body">
          {event.id === nextId && <span className="event-ticket__next">Next up</span>}
          <span className="event-ticket__group">{GROUP_LABELS[event.group]}</span>
          <h3><Link to={`/events/${event.id}`}>{event.title}</Link></h3>
          <p className="event-ticket__when">{eventTime(event)} · {event.venue.split(',')[0]}</p>
          <p className="event-ticket__description">{event.description}</p>
          <div className="event-ticket__actions">
            <span className="event-ticket__status">{eventStatusLabel(event)}</span>
            <Link className="event-ticket__register" to={`/attend?events=${encodeURIComponent(event.id)}`}>{canSelectEvent(event) ? 'Register' : 'Attendance options'} <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </div>
    </li>)}</ul>
    {!shown.length && <p>No upcoming events of this type.</p>}
  </div>
}
