import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CAMPUS_PHOTOS, SHOW_EVENT_PHOTOS } from '../data/assets'
import { RegisterButton } from './PageParts'
import { RevealText, RollingLabel } from './MotionText'
import BrandScene from './BrandScene'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const steps = [
  { title: 'Build.', label: 'Find your team', text: 'Start with a problem worth solving. Bring two to four students together and test your idea.', number: '2–4', metric: 'students. One team.', photo: CAMPUS_PHOTOS.teamwork, icon: '✳' },
  { title: 'Pitch.', label: 'Make your case', text: 'Five workshops to shape your business and sharpen your pitch. Four minutes to make it count.', number: '4', metric: 'minutes to pitch.', photo: CAMPUS_PHOTOS.stage, icon: '↗' },
  { title: 'Compete.', label: 'Take it further', text: 'Pitch at Windsor on February 5. The campus winner goes to Nationals in Calgary on April 10–11.', number: '01', metric: 'team represents Windsor.', photo: CAMPUS_PHOTOS.teams, icon: '◎' },
]

/** A pinned title zoom, five independent card paths, then accumulating action words. */
export function FloatingIntroduction() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const render = () => {
      frame = 0
      if (reduce.matches) { el.removeAttribute('data-scroll-scene'); return }
      el.dataset.scrollScene = 'active'
      const rect = el.getBoundingClientRect()
      const progress = clamp(-rect.top / Math.max(1, rect.height - innerHeight))
      const gather = clamp(progress / .55)
      const leave = clamp((progress - .53) / .14)
      const title = el.querySelector<HTMLElement>('.floating-intro__centre')!
      const heading = title.querySelector('h2')!
      const initialScale = Math.min(1.85, (innerWidth - 40) / heading.offsetWidth, (innerHeight - 120) / heading.offsetHeight)
      const titleScale = Math.max(.12, initialScale - gather * (initialScale - .15))
      title.style.transform = `translate3d(0,${-leave * innerHeight * .95}px,0) scale(${titleScale})`
      title.style.opacity = String(1 - clamp((gather - .87) / .13))
      const cards = el.querySelectorAll<HTMLElement>('.floating-card')
      const narrow = innerWidth <= 760
      const paths = [[-.55,-.15,-9], [.34,-.65,8], [.55,.43,10], [-.31,.6,-6], [.04,-.88,4]]
      cards.forEach((card, index) => {
        const [x, y, angle] = paths[index]
        const fly = 1 - clamp((gather - .05) / .95)
        const stagger = index * .016
        const exit = clamp((progress - .53 - stagger) / .14)
        card.style.transform = `translate3d(calc(-50% + ${x * innerWidth * fly}px),calc(-50% + ${y * innerHeight * fly - exit * innerHeight * 1.3}px),0) rotate(${angle * fly}deg) scale(${narrow ? .72 : 1})`
        card.style.opacity = String(clamp(gather * 7))
      })
      const rows = el.querySelectorAll<HTMLElement>('.intro-action')
      rows.forEach((row, index) => {
        const arrive = clamp((progress - .59 - index * .1) / .13)
        row.style.transform = `translate3d(0,${(1 - arrive) * innerHeight * .85}px,0)`
        row.style.opacity = String(clamp(arrive * 3))
      })
      el.style.setProperty('--intro-progress', String(progress))
    }
    const update = () => { if (!frame) frame = requestAnimationFrame(render) }
    render()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    reduce.addEventListener('change', update)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', update); removeEventListener('resize', update); reduce.removeEventListener('change', update) }
  }, [])
  return <section ref={ref} className="floating-intro" aria-labelledby="intro-heading"><div className="floating-intro__sticky">
    <div className="floating-intro__centre"><h2 id="intro-heading">Big ideas.<br />Start here.</h2></div>
    <div className="floating-intro__cards">
      <div className="floating-card floating-card--one"><span>The team</span><strong>2–4</strong><p>Different skills. Shared ambition.</p></div>
      <div className="floating-card floating-card--two">{SHOW_EVENT_PHOTOS ? <img src={CAMPUS_PHOTOS.applause.src} alt="" loading="lazy" /> : <span className="floating-symbol" aria-hidden="true">✳</span>}<span>Made of student ideas.</span></div>
      <div className="floating-card floating-card--three"><span>Your starting point</span><strong>$0</strong><p>Free entry. Free workshops.</p></div>
      <div className="floating-card floating-card--four">{SHOW_EVENT_PHOTOS ? <img src={CAMPUS_PHOTOS.pitch.src} alt="" loading="lazy" /> : <span className="floating-symbol" aria-hidden="true">↗</span>}<span>Four minutes. Make them count.</span></div>
      <div className="floating-card floating-card--five"><span>The global prize</span><strong>$1M</strong><p>One winning startup.<br />A world of possibility.</p></div>
    </div>
    <div className="intro-actions" aria-label="Build, pitch and compete">{steps.map(step => <div key={step.title} className="intro-action"><span aria-hidden="true">{step.icon}</span><p>{step.title}</p></div>)}</div>
  </div></section>
}

/** The next scene plays through three useful stages, with direct keyboard controls. */
export function JourneyExperience() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const selection = useRef<(index: number) => void>(() => {})
  const playback = useRef(0)
  useEffect(() => {
    const el = ref.current!
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    change(); media.addEventListener('change', change)
    let visible = false, frame = 0, previous = 0
    const tick = (time: number) => {
      frame = 0
      if (!visible || paused || media.matches || document.hidden) { previous = 0; return }
      if (previous) playback.current += Math.min(60, time - previous)
      previous = time
      const progress = Math.min(1, playback.current / 5600)
      el.style.setProperty('--journey-playback', String(progress))
      if (progress === 1) { playback.current = 0; setActive(index => (index + 1) % steps.length) }
      frame = requestAnimationFrame(tick)
    }
    const start = () => { if (!frame) frame = requestAnimationFrame(tick) }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start() }, { threshold: .4 })
    observer.observe(el)
    const visibility = () => { previous = 0; if (!document.hidden) start() }
    selection.current = index => { playback.current = 0; el.style.setProperty('--journey-playback', '0'); setActive(index) }
    media.addEventListener('change', start); document.addEventListener('visibilitychange', visibility)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener('change', change); media.removeEventListener('change', start); document.removeEventListener('visibilitychange', visibility) }
  }, [paused])
  const choose = (index: number) => { setPaused(true); selection.current(index) }
  return <section ref={ref} className="journey-experience journey-experience--simple" aria-labelledby="journey-heading" onFocusCapture={event => { if (!(event.target instanceof Element) || !event.target.closest('.journey-play')) setPaused(true) }}>
    <div className="journey-experience__sticky"><div className="container">
      <div className="journey-experience__top"><span className="tag">From idea to impact</span><div className="journey-controls"><div className="journey-tabs" role="tablist" aria-label="Competition journey">{steps.map((step, index) => <button key={step.title} role="tab" aria-selected={active === index} aria-controls={`journey-panel-${index}`} id={`journey-tab-${index}`} onClick={() => choose(index)} onKeyDown={event => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3
        choose(next); document.getElementById(`journey-tab-${next}`)?.focus()
      }} tabIndex={active === index ? 0 : -1}><span>0{index + 1}</span>{step.title.replace('.', '')}<i aria-hidden="true" /></button>)}</div>{!reduced && <button className="journey-play" aria-label={paused ? 'Play journey sequence' : 'Pause journey sequence'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '▷' : 'Ⅱ'}</button>}</div></div>
      <h2 id="journey-heading" className="visually-hidden">Build, pitch and compete</h2>
      <div className="journey-stages">{steps.map((step, index) => <div className={`journey-experience__stage${active === index ? ' is-active' : ''}`} key={step.title} role="tabpanel" aria-labelledby={`journey-tab-${index}`} id={`journey-panel-${index}`} aria-hidden={active !== index} inert={active !== index}>
        <div className="journey-copy"><p className="eyebrow">{step.label}</p><p className="journey-word">{step.title}</p><p className="journey-description">{step.text}</p><Link to="/compete" className="text-link" onFocus={() => setPaused(true)}>How to compete <span aria-hidden="true">↗</span></Link></div>
        <div className="journey-visual">{SHOW_EVENT_PHOTOS ? <img src={step.photo.src} alt={step.photo.alt} loading="lazy" /> : <BrandScene variant="blue" active={active === index} />}<div className="journey-metric"><strong>{step.number}</strong><span>{step.metric}</span></div></div>
      </div>)}</div>
    </div></div>
  </section>
}

export function ProgrammeFeature() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const draw = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const progress = reduce.matches ? 1 : clamp((innerHeight - rect.top) / (innerHeight * .8))
      el.style.setProperty('--feature-reveal', String(progress))
    }
    const update = () => { if (!frame) frame = requestAnimationFrame(draw) }
    draw(); addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); reduce.addEventListener('change', update)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', update); removeEventListener('resize', update); reduce.removeEventListener('change', update) }
  }, [])
  return <section ref={ref} className="programme-feature"><div className="programme-feature__scene"><BrandScene variant="blue" controls /></div><div className="container"><span className="tag">The 2026–2027 programme</span><h2 data-text-reveal><RevealText>Your idea.<br />Room to grow.</RevealText></h2><p>Workshops, mentors and a team beside you.<br />From your first pitch to the next stage.</p><div className="hero-actions"><RegisterButton /><Link to="/this-year" className="btn btn--outline"><RollingLabel>Explore the programme</RollingLabel><span aria-hidden="true">↗</span></Link></div></div></section>
}
