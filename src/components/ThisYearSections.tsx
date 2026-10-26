import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from './PageLink'
import { LAUNCH_DAY_PHOTOS } from '../data/assets'
import { SITE } from '../data/site'
import copy from '../data/copy.json'
import { localDay, useAttendanceEvents } from '../lib/attendance'
import './ThisYearSections.css'

type Goal = { paper: 'index' | 'legal' | 'graph' | 'kraft'; what: string; from: string; target: string; change: string; tape: string[] }

// This season's goals, each on its own kind of paper and taped up its own way.
const GOALS: Goal[] = [
  { paper: 'index', what: 'Startups registered', from: '14', target: '20', change: '+6', tape: ['tape--left'] },
  { paper: 'legal', what: 'Teams at the Grand Finale', from: '6', target: '10+', change: '+4', tape: [''] },
  { paper: 'graph', what: 'Raised from partners', from: '$8K', target: '$10K+', change: '+$2K', tape: ['tape--right'] },
  { paper: 'kraft', what: 'Campus events', from: '4', target: '6', change: '+2', tape: ['tape--left', 'tape--right'] },
]

// Two hasty red-marker strikes, each out across the figure and back as two strokes, so the ink doubles where they cross
// (drawn in a 100 × 22 box, stretched to the figure).
const STRIKES = [['M2 15C30 12 62 9 98 6', 'M98 6C72 9 40 13 10 17'], ['M3 7C34 9 66 12 97 16', 'M97 16C70 14 38 11 12 10']]

/** A loop of red marker round a figure `chars` characters long: a little lopsided, overshooting where it began. The loop
    and the overshoot are separate strokes, so the ink darkens where they cross. Its viewBox follows the figure's
    proportions (about .62em a character, plus room), so the stroke isn't stretched. */
function sketchedCircle(chars: number, variant: number) {
  const height = 60, width = Math.round(height * (chars * .62 + .95) / 1.5)
  const cx = width / 2, cy = height / 2
  const steps = 7, step = Math.PI * 2.25 / steps, k = 4 / 3 * Math.tan(step / 4)
  const start = Math.PI * (variant % 2 ? 1.2 : 1.08)
  const wobble = [.97, 1.03, .96, 1.02, 1, .98, 1.04, 1.06]
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const angle = start + i * step, grow = wobble[(i + variant) % wobble.length] * (1 + .06 * i / steps)
    return { angle, rx: (cx - 4) * grow, ry: (cy - 4) * grow, x: 0, y: 0 }
  }).map(p => ({ ...p, x: cx + p.rx * Math.cos(p.angle), y: cy + p.ry * Math.sin(p.angle) }))
  const n = (v: number) => Math.round(v * 10) / 10
  const stroke = (from: number, to: number) => points.slice(from + 1, to + 1).reduce((path, b, i) => {
    const a = points[from + i]
    const handles = [a.x - k * a.rx * Math.sin(a.angle), a.y + k * a.ry * Math.cos(a.angle), b.x + k * b.rx * Math.sin(b.angle), b.y - k * b.ry * Math.cos(b.angle)]
    return `${path}C${[...handles, b.x, b.y].map(n).join(' ')}`
  }, `M${n(points[from].x)} ${n(points[from].y)}`)
  return { width, height, loop: stroke(0, steps - 1), tail: stroke(steps - 1, steps), tilt: `rotate(${variant % 2 ? -3 : 4} ${n(cx)} ${cy})` }
}
const CIRCLES = GOALS.map((goal, index) => sketchedCircle(goal.target.length, index))

/** This season's goals on a chalkboard: the heading chalked on, then each goal on a
    different scrap of paper taped up at its own angle, with year one's figure struck through in red marker and the new
    goal circled. Chalk sits on the tray. The marker draws itself in once the cards come into view
    (straight away with reduced motion). */
export function SeasonGoals() {
  const cards = useRef<HTMLUListElement>(null)
  const [drawn, setDrawn] = useState(() => !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const element = cards.current
    if (drawn || !element) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setDrawn(true) }, { threshold: .3 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [drawn])
  return <div className="goal-board" data-draw={drawn ? 'done' : 'waiting'}>
    <svg className="goal-board__defs" aria-hidden="true" focusable="false"><defs>
      {/* Marker: edges roughened a little, as felt tip on paper, and the ink a little uneven along the stroke. */}
      <filter id="goal-marker" x="-15%" y="-100%" width="130%" height="300%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="11" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency=".05 .9" numOctaves="2" seed="4" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .9 0 0 0 .5" result="ink" />
        <feComposite in="rough" in2="ink" operator="in" />
      </filter>
      {/* Chalk lines: roughened, then speckled with gaps where the chalk skipped over the board. */}
      <filter id="goal-chalk" x="-10%" y="-100%" width="120%" height="300%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="3" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="grain" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.4 0 0 0 2.5" result="gaps" />
        <feComposite in="rough" in2="gaps" operator="in" />
      </filter>
      {/* Chalk lettering: ragged edges, the board's tooth showing through the strokes, and a little dust around them. */}
      <filter id="goal-chalk-text" x="-8%" y="-30%" width="116%" height="160%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="7" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency="1.1 .55" numOctaves="2" seed="2" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.8 0 0 0 2.15" result="tooth" />
        <feComposite in="rough" in2="tooth" operator="in" result="chalk" />
        <feGaussianBlur in="rough" stdDeviation="1.8" />
        <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .2 0" result="dust" />
        <feMerge><feMergeNode in="dust" /><feMergeNode in="chalk" /></feMerge>
      </filter>
      <filter id="goal-chalk-small" x="-6%" y="-25%" width="112%" height="150%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency="1.2 .6" numOctaves="2" seed="2" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.95" result="tooth" />
        <feComposite in="rough" in2="tooth" operator="in" />
      </filter>
    </defs></svg>
    <div className="goal-board__header">
      <div className="goal-board__title">
        {/* Plain text, not the letter-by-letter reveal: that gives each letter its own box and layer, and Safari and
            GPU-composited browsers then run the chalk filter letter by letter, cutting each one at its box. */}
        <h2>What we’re building<br />this year</h2>
        <svg className="goal-board__underline" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path d="M4 15C70 8 160 6 296 11M22 20C104 14 190 13 282 16" /></svg>
      </div>
      <p className="goal-board__lead">{copy.yearPlan[0]}</p>
      <svg className="goal-board__arrow" viewBox="0 0 150 110" aria-hidden="true"><path d="M136 6C130 52 92 84 24 92M42 76L22 92L44 104" /></svg>
    </div>
    <ul className="goal-cards" ref={cards}>{GOALS.map((goal, index) => {
      const circle = CIRCLES[index]
      return <li key={goal.what} className={`goal goal--${goal.paper}`} style={{ '--i': index } as CSSProperties}>
        <div className={`goal-card goal-card--${goal.paper}`}>
          {goal.tape.map(side => <span key={side} className={`tape ${side}`.trim()} aria-hidden="true" />)}
          <h3>{goal.what}</h3>
          <dl className="goal-card__figures">
            <div className="goal-card__was"><dt>Year one</dt><dd><span className="goal-card__struck">{goal.from}<svg className="goal-card__strike" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true">{STRIKES[index % 2].map(d => <path key={d} d={d} pathLength={1} />)}</svg></span></dd></div>
            <div className="goal-card__goal"><dt className="visually-hidden">This year’s goal</dt><dd><span className="goal-card__circled">{goal.target}<svg className="goal-card__circle" viewBox={`0 0 ${circle.width} ${circle.height}`} style={{ '--ratio': `${circle.width} / ${circle.height}` } as CSSProperties} aria-hidden="true"><g transform={circle.tilt}><path d={circle.loop} pathLength={1} /><path d={circle.tail} pathLength={1} /></g></svg></span></dd></div>
            <div className="goal-card__change"><dt className="visually-hidden">Up on year one by</dt><dd>{goal.change}</dd></div>
          </dl>
        </div>
      </li>
    })}</ul>
    <p className="goal-board__note">{copy.yearPlan[1]}</p>
    <div className="goal-board__tray" aria-hidden="true"><span className="goal-board__chalk" /><span className="goal-board__chalk goal-board__chalk--pink" /></div>
  </div>
}

/** Launch day at Fusion as a grid of taped snapshots, shown whole. */
export function LaunchPhotos() {
  const photos = LAUNCH_DAY_PHOTOS
  if (!photos.length) return null
  return <ul className="launch-strip">{photos.map(photo => <li key={photo.name}><figure>
    <img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 760px) 46vw, 300px" width={720} height={480} alt={photo.alt} loading="lazy" />
    <figcaption>{photo.caption}</figcaption>
  </figure></li>)}</ul>
}

/** The season so far: launch day at Fusion. */
export function LaunchStrip() {
  return <>
    <p className="section-intro">On October 1, we opened our new headquarters at Fusion, on the second floor of the Joyce Entrepreneurship Centre. Teams will use the space to develop their businesses, meet other students and attend workshops throughout the year.</p>
    <LaunchPhotos />
    <Link className="text-link" to="/events/fusion-launch">Read about launch day <span aria-hidden="true">→</span></Link>
  </>
}

const longDate = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' })
const CHECKLIST_KEY = 'hult-season-checklist'
// Two hand-drawn ticks in a 40 × 40 box laid over the checkbox (whose square sits at about 5-29), the upstroke running
// out past its top corner.
const TICKS = ['M9 23C11 26 13 29 15 33C20 22 27 11 38 2', 'M8 24C10.5 27 13 30 14.5 34C19 23 26 12 37 4']

/** The five steps through the season as a printed checklist: a box, then the step, a dotted leader and its dates from
    the live schedule, which together link to the step's action. Following a link ticks its box (with a marker tick), the
    box can be ticked or unticked by hand, and this browser remembers which are done. */
export function SeasonChecklist() {
  const { events } = useAttendanceEvents()
  const [now] = useState(() => Date.now())
  const find = (id: string) => events.find(item => item.id === id)
  const date = (id: string) => { const event = find(id); return event ? longDate.format(new Date(`${localDay(event.startsAt, event.timeZone)}T12:00:00Z`)) : '' }
  const [first, last] = [date('workshop-1'), date('workshop-5')]
  // Preselect whichever info session is still ahead.
  const infoSession = ['info-session-1', 'info-session-2'].find(id => { const event = find(id); return event && new Date(event.endsAt).getTime() > now })
  const steps: { id: string; title: string; when: string; to: string; external?: boolean }[] = [
    { id: 'register', title: 'Register your team', when: `by ${longDate.format(new Date(`${SITE.registrationClosesOn}T12:00:00Z`))}`, to: SITE.registrationUrl, external: true },
    { id: 'info-session', title: 'Come to an info session', when: [date('info-session-1'), date('info-session-2')].filter(Boolean).join(' or '), to: infoSession ? `/attend?events=${infoSession}` : '/attend' },
    { id: 'team-mixer', title: 'Find teammates at the Team Mixer', when: date('team-mixer'), to: '/attend?events=team-mixer' },
    { id: 'workshops', title: 'Work through the five workshops', when: first && last ? `${first} to ${last}` : '', to: '/attend?events=workshop-1,workshop-2,workshop-3,workshop-4,workshop-5' },
    { id: 'finale', title: 'Pitch at the Campus Grand Finale', when: date('campus-grand-finale'), to: '/events/campus-grand-finale' },
  ]
  const [done, setDone] = useState<string[]>(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '[]'); return Array.isArray(saved) ? saved.filter(item => typeof item === 'string') : [] } catch { return [] }
  })
  const tick = (id: string, checked: boolean) => {
    if (checked === done.includes(id)) return
    const next = checked ? [...done, id] : done.filter(item => item !== id)
    setDone(next)
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)) } catch { /* Storage blocked: the ticks last until the page closes. */ }
  }
  return <ol className="season-checklist">{steps.map((step, index) => {
    const content = <>
      <span className="checklist-item__task">{step.title}</span>
      {step.when && <><span className="checklist-item__leader" aria-hidden="true" /><span className="checklist-item__when">{step.when}</span></>}
      <span className="checklist-item__go" aria-hidden="true">{step.external ? '↗' : '→'}</span>
    </>
    return <li key={step.id} className="checklist-item">
      <input type="checkbox" aria-label={step.title} checked={done.includes(step.id)} onChange={event => tick(step.id, event.target.checked)} />
      <span className="checklist-item__box" aria-hidden="true"><svg viewBox="0 0 40 40"><path d={TICKS[index % 2]} pathLength={1} /></svg></span>
      {step.external
        ? <a className="checklist-item__link" href={step.to} target="_blank" rel="noopener noreferrer" onClick={() => tick(step.id, true)}>{content}</a>
        : <Link className="checklist-item__link" to={step.to} onClick={() => tick(step.id, true)}>{content}</Link>}
    </li>
  })}</ol>
}
