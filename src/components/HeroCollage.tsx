import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'
import { HOME_BOARD_PHOTOS } from '../data/assets'
import './HeroCollage.css'

/** Same scatter on every visit: a fixed hash of the photo's position and a channel. */
const jitter = (index: number, channel: number) => {
  const value = Math.sin((index + 1) * 12.9898 + channel * 78.233) * 43758.5453
  return value - Math.floor(value)
}
// A fresh random entrance order on each page load, so photos land all over the board instead of row by row.
const ENTRANCE_ORDER = HOME_BOARD_PHOTOS.map((_, index) => index)
for (let index = ENTRANCE_ORDER.length - 1; index > 0; index--) {
  const other = Math.floor(Math.random() * (index + 1))
  ;[ENTRANCE_ORDER[index], ENTRANCE_ORDER[other]] = [ENTRANCE_ORDER[other], ENTRANCE_ORDER[index]]
}
// A nudged photo swings on its pin and settles: degrees at each point of the swing.
const SWING = [[0, 0], [.14, 5], [.34, -4], [.54, 2.6], [.72, -1.5], [.88, .6], [1, 0]]

/** Hovering nudges a photo away from the pointer. A swing already under way finishes rather than restarting. */
function swing(event: PointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const photo = event.currentTarget.querySelector<HTMLElement>('.pinned__photo')
  if (!photo || photo.getAnimations().some(animation => animation.id === 'pin-swing' && animation.playState === 'running')) return
  const bounds = photo.getBoundingClientRect()
  const away = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1
  photo.animate(SWING.map(([offset, angle]) => ({ offset, rotate: `${angle * away}deg`, easing: 'ease-in-out' })), { id: 'pin-swing', duration: 1600 })
}

/**
 * The homepage hero's cork board: event photos fill it in pin order, each tilted, pinned and gently swaying from its
 * pin.
 */
export default function HeroCollage() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => element.classList.toggle('is-offscreen', !entry.isIntersecting))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="cork-board">
    <div className="cork-board__surface">
      {HOME_BOARD_PHOTOS.map((photo, index) => {
        const style = {
          '--i': index,
          '--order': ENTRANCE_ORDER[index],
          '--rot': `${(jitter(index, 1) - .5) * 14}deg`,
          '--dx': `${(jitter(index, 2) - .5) * 22}%`,
          '--dy': `${(jitter(index, 3) - .5) * 24}%`,
          '--scale': 1.18 + jitter(index, 4) * .24,
          '--pin-x': `${42 + jitter(index, 6) * 16}%`,
          '--sway': `${5 + jitter(index, 7) * 3}s`,
          '--z': 10 + Math.floor(jitter(index, 8) * 30),
        } as CSSProperties
        return <figure key={photo.src} className={`pinned${photo.portrait ? ' pinned--portrait' : ''}`} style={style} aria-hidden="true" onPointerEnter={swing}>
          <div className="pinned__sway">
            <div className="pinned__photo"><img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 600px) 42vw, (max-width: 1000px) 22vw, 12vw" alt="" loading={index < 14 ? 'eager' : 'lazy'} decoding="async" draggable="false" /></div>
            <span className="pin" />
          </div>
        </figure>
      })}
      {HOME_BOARD_PHOTOS.length > 0 && <p className="visually-hidden">Photos from our first season and this year’s launch at Fusion are pinned around the board.</p>}
    </div>
  </div>
}
