import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { HOME_BOARD_PHOTOS } from '../data/assets'
import './HeroCollage.css'

const PIN_COLORS = ['#ff329b', '#2f80d1', '#ffc23d', '#2fbf97', '#ff7a59']
const STICKERS = [
  { kind: 'award', text: 'Best Program in North America', x: 37, y: 2, rot: 10 },
  { kind: 'count', text: '14 startups in year one', x: 24, y: 53, rot: -5 },
]
/** Same scatter on every visit: a fixed hash of the photo's position and a channel. */
const jitter = (index: number, channel: number) => {
  const value = Math.sin((index + 1) * 12.9898 + channel * 78.233) * 43758.5453
  return value - Math.floor(value)
}

/**
 * The homepage hero as a cork board. Its children (the title card and sticky note) are placed by CSS;
 * event photos fill the rest of the board in pin order, each tilted, pinned and gently swaying from its pin.
 */
export default function HeroCollage({ children }: { children: ReactNode }) {
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
      {children}
      {HOME_BOARD_PHOTOS.map((photo, index) => {
        const style = {
          '--i': index,
          '--rot': `${(jitter(index, 1) - .5) * 14}deg`,
          '--dx': `${(jitter(index, 2) - .5) * 22}%`,
          '--dy': `${(jitter(index, 3) - .5) * 24}%`,
          '--scale': 1.18 + jitter(index, 4) * .24,
          '--pin': PIN_COLORS[(index + Math.floor(jitter(index, 5) * 2)) % PIN_COLORS.length],
          '--pin-x': `${42 + jitter(index, 6) * 16}%`,
          '--sway': `${5 + jitter(index, 7) * 3}s`,
          '--z': 10 + Math.floor(jitter(index, 8) * 30),
        } as CSSProperties
        return <figure key={photo.src} className={`pinned${photo.portrait ? ' pinned--portrait' : ''}`} style={style} aria-hidden="true">
          <div className="pinned__sway">
            <div className="pinned__photo"><img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 600px) 42vw, (max-width: 1000px) 22vw, 12vw" alt="" loading={index < 14 ? 'eager' : 'lazy'} decoding="async" draggable="false" /></div>
            <span className="pin" />
          </div>
        </figure>
      })}
      {STICKERS.map((sticker, index) => <span key={sticker.kind} className={`board-sticker board-sticker--${sticker.kind}`} aria-hidden="true" style={{ '--x': `${sticker.x}%`, '--y': `${sticker.y}%`, '--rot': `${sticker.rot}deg`, '--i': index } as CSSProperties}>{sticker.text}</span>)}
      {HOME_BOARD_PHOTOS.length > 0 && <p className="visually-hidden">Photos from our first season and this year’s launch at Fusion are pinned around the board.</p>}
    </div>
  </div>
}
