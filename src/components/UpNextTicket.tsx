import { useState } from 'react'
import { Link } from './PageLink'
import { RevealText } from './MotionText'
import { eventTime, localDay, type AttendanceEvent } from '../lib/attendance'
import './UpNextTicket.css'

const part = (event: AttendanceEvent, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: event.timeZone, ...options }).format(new Date(event.startsAt))

/** Whole days from today until the event, both counted in Windsor time. */
function countdown(event: AttendanceEvent, now: number) {
  const days = Math.round((Date.parse(localDay(event.startsAt, event.timeZone)) - Date.parse(localDay(now, event.timeZone))) / 86_400_000)
  return days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`
}

/** The homepage's next event as an admission ticket: a dated stub, the event, and a free "save my spot" call to action. */
export default function UpNextTicket({ event }: { event: AttendanceEvent }) {
  const [now] = useState(() => Date.now())
  return <section className="home-next-event" aria-labelledby="up-next-title"><div className="container">
    <Link className="up-next-ticket" to={`/attend?events=${encodeURIComponent(event.id)}`}>
      <span className="up-next-ticket__paper">
        <time className="up-next-ticket__stub" dateTime={event.startsAt}>
          <span className="up-next-ticket__month">{part(event, { month: 'short' })}</span>
          <span className="up-next-ticket__day">{part(event, { day: 'numeric' })}</span>
          <span className="up-next-ticket__weekday">{part(event, { weekday: 'long' })}</span>
          <span className="up-next-ticket__admit" aria-hidden="true">Admit one</span>
        </time>
        <span className="up-next-ticket__body">
          <span className="up-next-ticket__meta">Up next · <span className="up-next-ticket__countdown">{countdown(event, now)}</span></span>
          <h2 id="up-next-title" data-text-reveal><RevealText>{event.title}</RevealText></h2>
          <span className="up-next-ticket__details">Free · {eventTime(event)} · {event.venue.split(',')[0]}</span>
        </span>
        <span className="up-next-ticket__action">
          <span className="up-next-ticket__cta">Save my spot <span aria-hidden="true">→</span></span>
        </span>
      </span>
    </Link>
  </div></section>
}
