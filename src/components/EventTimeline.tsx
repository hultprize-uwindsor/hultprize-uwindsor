import './EventTimeline.css'

export default function EventTimeline({ items }: { items: string[][] }) {
  return <ol className="event-timeline">
    {items.map(([date, description]) => <li key={date}>
      <article className="event-timeline__card">
        <p className="event-timeline__date">{date}</p>
        <h3>{description}</h3>
      </article>
    </li>)}
  </ol>
}
