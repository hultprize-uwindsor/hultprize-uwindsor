import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from './PageLink'
import './SeasonMilestones.css'

type Stage = {
  id: string
  stage: string
  figure: string
  title: string
  when: string
  happened: string
  notes?: string
  deliverables?: string[]
  link?: [to: string, label: string]
}

// Year one, from the owner's season summary and this season's goals, as six stages. Only facts the site already
// states are used.
const STAGES: Stage[] = [
  { id: 'launch', stage: 'Launch', figure: '2025', title: 'Hult Prize comes to Windsor', when: '2025, for the 2025-2026 season', happened: 'UWindsor joined Hult Prize for the 2025-2026 season, led by founding Campus Director Godswisdom Ogbonna.' },
  { id: 'backing', stage: 'Backing', figure: '$8,000', title: 'From ten partners', when: 'The 2025-2026 season', happened: 'Ten partners contributed $8,000 to run the first season.', notes: 'This season’s goal: $10,000 or more.', link: ['/partners', 'Meet our partners'] },
  { id: 'registration', stage: 'Registration', figure: '14', title: 'Startups registered', when: 'The first campus round', happened: 'Fourteen student startups signed up for the first campus round.', notes: 'This season’s goal: 20 startups.', deliverables: ['A team of two to four students'] },
  { id: 'finale', stage: 'Grand Finale', figure: '6', title: 'Teams at the Grand Finale', when: 'The first Campus Grand Finale', happened: 'Six teams pitched to judges from Windsor’s business community.', notes: 'This season’s goal: 10 or more teams.', deliverables: ['A four-minute pitch to the judges'] },
  { id: 'nationals', stage: 'Nationals', figure: '2', title: 'Teams at Nationals', when: 'The Canadian National Championships, McGill University, Montreal', happened: 'Mycovolt and 100% Fish advanced to Nationals. 100% Fish finished in Canada’s top eight.', notes: 'This season, Nationals are in Calgary on April 10-11.' },
  { id: 'recognition', stage: 'Recognition', figure: '★', title: 'Best Program in North America', when: '2026, from the Hult Prize Foundation', happened: 'The Hult Prize Foundation named UWindsor the Best Program in North America.' },
]

// Hover opens notes only where they sit in one row and the pointer can hover; stacked notes would shift under it.
const HOVER_ROW = '(min-width: 1280px) and (hover: hover) and (pointer: fine)'

/** The first season as a page in a spiral notebook: each stage is a handwritten note taped along a pen-drawn line.
    On desktop a note widens while the pointer is on it and closes when it leaves; elsewhere a tap opens and closes it
    (dropping it open on phones). Open, it shows when, what happened, notes and deliverables. */
export default function SeasonMilestones() {
  const canHover = () => window.matchMedia(HOVER_ROW).matches
  // Desktop rests with every note closed; phones open the first stage.
  const [open, setOpen] = useState<number | null>(() => canHover() ? null : 0)
  const hoverTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])
  // One timer for both: a short pause before opening, so sweeping across the row doesn't flip through every note, and
  // a slightly longer one before closing, so moving straight to the next note swaps them without the row collapsing.
  const hoverTo = (next: number | null, delay: number) => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setOpen(next), delay)
  }
  const pointerEnter = (index: number) => { if (canHover()) hoverTo(index, 120) }
  const pointerLeave = (step: HTMLElement) => {
    if (!canHover()) return
    // A keyboard user reading the note keeps it open; the pointer passing by doesn't close it under them.
    if (step.querySelector(':focus-visible')) window.clearTimeout(hoverTimer.current)
    else hoverTo(null, 180)
  }
  // Keyboard: a note opened with Enter closes once focus moves on to another stage.
  const focusLeave = (index: number, step: HTMLElement, next: EventTarget | null) => {
    if (canHover() && !(next instanceof Node && step.contains(next))) setOpen(current => current === index ? null : current)
  }
  // Desktop columns: the open note takes a wider share; the grid animates between the two.
  const columns = STAGES.map((_, index) => index === open ? 'minmax(0,2.9fr)' : 'minmax(0,1fr)').join(' ')
  return <div className="notebook">
    <p className="notebook__date" aria-hidden="true">2025-2026</p>
    <ol className="notebook-steps" style={{ '--cols': columns } as CSSProperties}>{STAGES.map((stage, index) => {
      const isOpen = open === index
      return <li key={stage.id} className={`notebook-step${isOpen ? ' is-open' : ''}`} onPointerEnter={() => pointerEnter(index)} onPointerLeave={event => pointerLeave(event.currentTarget)} onBlur={event => focusLeave(index, event.currentTarget, event.relatedTarget)}>
        <span className="notebook-step__stage" aria-hidden="true">{stage.stage}</span>
        <div className="notebook-note">
          <span className="tape" aria-hidden="true" />
          <button type="button" className="notebook-note__toggle" id={`stage-${stage.id}`} aria-expanded={isOpen} aria-controls={`stage-${stage.id}-details`} onClick={() => setOpen(isOpen && !canHover() ? null : index)}>
            <span className="notebook-note__figure" aria-hidden={stage.figure === '★' || undefined}>{stage.figure}</span>
            <span className="notebook-note__title">{stage.title}</span>
            <span className="notebook-note__mark" aria-hidden="true" />
          </button>
          <div className="notebook-note__details" id={`stage-${stage.id}-details`} role="region" aria-labelledby={`stage-${stage.id}`} inert={!isOpen}>
            <div><div className="notebook-note__body">
              <dl>
                <div><dt>When</dt><dd>{stage.when}</dd></div>
                <div><dt>What happened</dt><dd>{stage.happened}</dd></div>
                {stage.notes && <div><dt>Notes</dt><dd>{stage.notes}</dd></div>}
                {stage.deliverables && <div><dt>Deliverables</dt><dd><ul>{stage.deliverables.map(item => <li key={item}>{item}</li>)}</ul></dd></div>}
              </dl>
              {stage.link && <Link className="notebook-note__link" to={stage.link[0]}>{stage.link[1]} <span aria-hidden="true">→</span></Link>}
            </div></div>
          </div>
        </div>
      </li>
    })}</ol>
  </div>
}
