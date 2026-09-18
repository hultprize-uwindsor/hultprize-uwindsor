import { useEffect, useRef } from 'react'
import './EventTimeline.css'

export default function EventTimeline({ items }: { items: string[][] }) {
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const cards = [...(list.current?.querySelectorAll<HTMLElement>('.event-timeline__card') ?? [])]
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        ;(entry.target as HTMLElement).dataset.reveal = 'visible'
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.15, rootMargin: '0px 0px -32px 0px' })
    cards.forEach(card => {
      card.dataset.reveal = 'pending'
      observer.observe(card)
    })
    const showAll = () => {
      if (!preference.matches) return
      observer.disconnect()
      cards.forEach(card => { card.dataset.reveal = 'visible' })
    }
    preference.addEventListener('change', showAll)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', showAll)
    }
  }, [])

  return <ol className="event-timeline" ref={list}>
    {items.map(([date, description]) => <li key={date}>
      <article className="event-timeline__card">
        <p className="event-timeline__date">{date}</p>
        <h3>{description}</h3>
      </article>
    </li>)}
  </ol>
}
