import './EventTimeline.css'
import { Link } from './PageLink'

export default function EventTimeline({ items }: { items: string[][] }) {
  return <ol className="event-timeline">
    {items.map(([date, description, to, detail]) => <li key={description}>
      <article className="event-timeline__card">
        <p className="event-timeline__date">{date}</p>
        <h3>{description}</h3>
        {detail && <p className="event-timeline__detail">{detail}</p>}
        {to && <Link className="text-link" to={to}>Event details and registration <span aria-hidden="true">→</span></Link>}
      </article>
    </li>)}
  </ol>
}
