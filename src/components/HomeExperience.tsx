import { useEffect, useRef, useState } from 'react'
import { Link } from './PageLink'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { CAMPUS_PHOTOS, HOME_EVENT_PHOTOS, SHOW_EVENT_PHOTOS } from '../data/assets'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const steps = [
  { title: 'Build.', label: 'Find your team', text: 'Start with a problem worth solving. Bring two to four students together and test your idea.', number: '2–4', metric: 'students. One team.', photos: [HOME_EVENT_PHOTOS[3], HOME_EVENT_PHOTOS[2]], icon: '✳' },
  { title: 'Pitch.', label: 'Make your case', text: 'Five workshops to shape your business and sharpen your pitch. Four minutes to make it count.', number: '4', metric: 'minutes to pitch.', photos: [HOME_EVENT_PHOTOS[0], HOME_EVENT_PHOTOS[1]], icon: '↗' },
  { title: 'Compete.', label: 'Take it further', text: 'Pitch at Windsor on February 5. Up to three teams can represent UWindsor at Nationals in Calgary on April 10–11.', prefix: 'Up to', number: '3', metric: 'teams at Nationals.', photos: [HOME_EVENT_PHOTOS[4], HOME_EVENT_PHOTOS[5]], icon: '◎' },
]
const PHOTO_DURATION = 3500
const STAGE_DURATION = PHOTO_DURATION * 2

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

/** Six event photos play through the three stages with manual photo and stage navigation. */
export function JourneyExperience() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [photo, setPhoto] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const playback = useRef(0)
  const galleryFocus = useRef(0)
  const playing = visible && pageVisible && !paused && !reduced

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    const visibility = () => setPageVisible(!document.hidden)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .12 })
    observer.observe(ref.current!)
    media.addEventListener('change', change)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); cancelAnimationFrame(galleryFocus.current); media.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    if (!playing) return
    let frame = 0, previous = 0
    const tick = (time: number) => {
      const before = playback.current
      if (previous) playback.current += time - previous
      previous = time
      if (playback.current >= STAGE_DURATION) {
        playback.current = 0
        setPhoto(0)
        setActive(index => (index + 1) % steps.length)
      } else if (before < PHOTO_DURATION && playback.current >= PHOTO_DURATION) setPhoto(1)
      ref.current?.style.setProperty('--journey-playback', String(playback.current / STAGE_DURATION))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const choose = (index: number, photoIndex = 0) => {
    cancelAnimationFrame(galleryFocus.current)
    galleryFocus.current = 0
    setPaused(true)
    playback.current = photoIndex * PHOTO_DURATION
    ref.current?.style.setProperty('--journey-playback', String(playback.current / STAGE_DURATION))
    setActive(index)
    setPhoto(photoIndex)
  }
  const choosePhoto = (direction: number) => {
    const next = (active * 2 + photo + direction + HOME_EVENT_PHOTOS.length) % HOME_EVENT_PHOTOS.length
    const stage = Math.floor(next / 2)
    choose(stage, next % 2)
    // The old controls become inert. Wait for the new panel's visibility before focusing.
    if (stage !== active) {
      const focusControl = () => {
        galleryFocus.current = 0
        const button = ref.current?.querySelector<HTMLButtonElement>(`#journey-panel-${stage} .journey-gallery__${direction > 0 ? 'next' : 'previous'}`)
        if (!button || button.closest('[inert]')) return
        if (getComputedStyle(button).visibility !== 'visible') {
          galleryFocus.current = requestAnimationFrame(focusControl)
          return
        }
        button.focus({ preventScroll: true })
      }
      galleryFocus.current = requestAnimationFrame(focusControl)
    }
  }
  return <section ref={ref} className={`journey-experience journey-experience--simple${playing ? ' is-playing' : ''}`} aria-labelledby="journey-heading" onFocusCapture={() => setPaused(true)}>
    <div className="journey-experience__sticky"><div className="container">
      <div className="journey-experience__top"><span className="tag">From idea to impact</span></div>
      <h2 id="journey-heading" className="visually-hidden">Build, pitch and compete</h2>
      <div className="journey-stages">{steps.map((step, index) => <div className={`journey-experience__stage${active === index ? ' is-active' : ''}`} key={step.title} role="group" aria-labelledby={`journey-title-${index}`} id={`journey-panel-${index}`} aria-hidden={active !== index} inert={active !== index}>
        <div className="journey-copy"><p className="eyebrow">{step.label}</p><p className="journey-word" id={`journey-title-${index}`}>{step.title}</p><p className="journey-description">{step.text}</p><Link to="/compete" className="text-link" onFocus={() => setPaused(true)}>How to compete <span aria-hidden="true">↗</span></Link></div>
        <div className="journey-visual" role="region" aria-roledescription="carousel" aria-label={`${step.title.replace('.', '')}: past events`}>
          {step.photos.map((image, photoIndex) => <figure key={image.src} className={`journey-gallery__photo${photoIndex === photo ? ' is-active' : ''}`} aria-hidden={photoIndex !== photo} role="group" aria-roledescription="slide" aria-label={`${index * 2 + photoIndex + 1} of ${HOME_EVENT_PHOTOS.length}`}><img src={image.src} alt={image.alt} loading="lazy" draggable="false" /></figure>)}
          <div className="journey-gallery__toolbar"><span className="journey-gallery__count" aria-hidden="true">{String(index * 2 + photo + 1).padStart(2, '0')} / {String(HOME_EVENT_PHOTOS.length).padStart(2, '0')}</span><div><button className="journey-gallery__previous" type="button" aria-label="Previous journey photo" onClick={() => choosePhoto(-1)}><ArrowLeft size={18} /></button><button className="journey-gallery__next" type="button" aria-label="Next journey photo" onClick={() => choosePhoto(1)}><ArrowRight size={18} /></button></div></div>
          <div className="journey-metric"><div className="journey-metric__number">{step.prefix && <span>{step.prefix}</span>}<strong>{step.number}</strong></div><span>{step.metric}</span></div>
        </div>
      </div>)}</div>
    </div></div>
  </section>
}
