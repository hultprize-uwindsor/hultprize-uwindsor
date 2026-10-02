import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import BrandScene from './BrandScene'
import { RollingLabel } from './MotionText'
import { RegisterButton } from './PageParts'
import { HOME_EVENT_PHOTOS } from '../data/assets'
import './ProgrammeFeature.css'

const SLIDE_DURATION = 5000

/** A normally scrolling, looping phone scene with real campus photography. */
export function ProgrammeFeature() {
  const root = useRef<HTMLElement>(null)
  const elapsed = useRef(0)
  const touchStart = useRef<number | null>(null)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const playing = visible && pageVisible && !paused && !reduced

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setReduced(media.matches)
    const visibility = () => setPageVisible(!document.hidden)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .12 })
    observer.observe(root.current!)
    media.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let previous = 0
    const advance = (now: number) => {
      if (previous) elapsed.current += now - previous
      previous = now
      if (elapsed.current >= SLIDE_DURATION) {
        elapsed.current = 0
        setActive(index => (index + 1) % HOME_EVENT_PHOTOS.length)
      }
      root.current?.style.setProperty('--gallery-progress', String(elapsed.current / SLIDE_DURATION))
      frame = requestAnimationFrame(advance)
    }
    frame = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const choose = (direction: number) => {
    setPaused(true)
    elapsed.current = 0
    root.current?.style.setProperty('--gallery-progress', '0')
    setActive(index => (index + direction + HOME_EVENT_PHOTOS.length) % HOME_EVENT_PHOTOS.length)
  }

  return <section ref={root} className={`programme-feature event-showcase${playing ? ' is-playing' : ''}`} aria-labelledby="programme-feature-title">
    <div className="event-showcase__background"><BrandScene variant="blue" active={playing || reduced} /></div>
    <div className="container event-showcase__copy">
      <h2 id="programme-feature-title">Your idea.<br />Room to grow.</h2>
      <p>Workshops, mentors and a team beside you.<br />From your first pitch to the next stage.</p>
      <div className="hero-actions"><RegisterButton /><Link to="/this-year" className="text-link"><RollingLabel>Explore the programme</RollingLabel><span aria-hidden="true">↗</span></Link></div>
    </div>
    <div className="event-showcase__gallery" role="region" aria-roledescription="carousel" aria-label="Past events at UWindsor" onFocusCapture={event => {
      if (!(event.target instanceof Element) || !event.target.closest('.event-showcase__play')) setPaused(true)
    }} onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); choose(event.key === 'ArrowRight' ? 1 : -1) }
    }}>
      <div className="event-phone" onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null }} onTouchEnd={event => {
        if (touchStart.current !== null) {
          const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
          if (Math.abs(distance) > 45) choose(distance < 0 ? 1 : -1)
          touchStart.current = null
        }
      }}>
        <span className="event-phone__side-button event-phone__side-button--left" aria-hidden="true" />
        <span className="event-phone__side-button event-phone__side-button--right" aria-hidden="true" />
        <div className="event-phone__screen">
          <div className="event-phone__status" aria-hidden="true"><span>9:41</span><i /><span className="event-phone__signal">▮▮▮ <b /></span></div>
          <div className="event-phone__progress" aria-hidden="true">{HOME_EVENT_PHOTOS.map((photo, index) => <span key={photo.src} className={index === active ? 'is-current' : index < active ? 'is-complete' : ''}><i /></span>)}</div>
          <div className="event-phone__heading" aria-hidden="true"><span>Hult Prize</span><span>UWindsor</span></div>
          {HOME_EVENT_PHOTOS.map((photo, index) => <figure className={`event-phone__slide${index === active ? ' is-active' : ''}`} key={photo.src} aria-hidden={index !== active} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${HOME_EVENT_PHOTOS.length}`}>
            <img src={photo.src} alt={photo.alt} loading="lazy" draggable="false" />
          </figure>)}
          <div className="event-phone__caption" aria-live={paused ? 'polite' : 'off'} aria-atomic="true"><span>Our first season</span><p>{HOME_EVENT_PHOTOS[active].caption}</p></div>
          <div className="event-phone__controls">
            <button type="button" aria-label="Previous event photo" onClick={() => choose(-1)}><ArrowLeft size={19} /></button>
            <span className="event-phone__count" aria-hidden="true">{String(active + 1).padStart(2, '0')} / {String(HOME_EVENT_PHOTOS.length).padStart(2, '0')}</span>
            <button type="button" aria-label="Next event photo" onClick={() => choose(1)}><ArrowRight size={19} /></button>
          </div>
          <span className="event-phone__home" aria-hidden="true" />
        </div>
      </div>
      {!reduced && <button type="button" className="event-showcase__play" aria-label={paused ? 'Play event gallery' : 'Pause event gallery'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}<span>{paused ? 'Play gallery' : 'Pause gallery'}</span></button>}
    </div>
  </section>
}
