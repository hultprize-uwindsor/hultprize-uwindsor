import { Link } from './PageLink'
import { canSelectEvent, eventDate, eventTime, eventStatusLabel, GROUP_LABELS, useAttendanceEvents } from '../lib/attendance'
import './AttendanceCatalogue.css'

export default function AttendanceCatalogue() {
  const { events, error } = useAttendanceEvents()
  return <div className="attendance-catalogue">
    <p>Free events for students across all faculties, sponsors and community guests. Drinks and snacks are provided. All times are local Windsor time.</p>
    <Link className="btn btn--primary" to="/attend">Attend our events <span aria-hidden="true">→</span></Link>
    {error && <p className="schedule-note" role="status">Schedule for reference; live registration is temporarily unavailable.</p>}
    <div className="attendance-catalogue__grid">{events.map(event => <article key={event.id}>
      <span className="tag">{GROUP_LABELS[event.group]}</span>
      <h3><Link to={`/events/${event.id}`}>{event.title}</Link></h3>
      <p><time dateTime={event.startsAt}>{eventDate(event)}</time><br />{eventTime(event)}</p>
      <p>{event.venue}</p><p>{event.description}</p>
      <p><strong>{eventStatusLabel(event)}</strong> · Free · Drinks and snacks provided.</p>
      <Link className="text-link" to={`/attend?events=${encodeURIComponent(event.id)}`}>{canSelectEvent(event) ? 'Register to attend' : 'View attendance options'} <span aria-hidden="true">→</span></Link>
    </article>)}</div>
  </div>
}
