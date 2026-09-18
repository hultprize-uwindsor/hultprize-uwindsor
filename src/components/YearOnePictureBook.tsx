import { useEffect, useRef, useState } from 'react'
import { ThreeDImagePageflip, type PageFlipLeaf } from '../lightswind/ThreeDImagePageflip'
import { CAMPUS_PHOTOS, YEAR_ONE_PHOTOS } from '../data/assets'
import './YearOnePictureBook.css'

const photos = [CAMPUS_PHOTOS.room, ...YEAR_ONE_PHOTOS]
type BookFace = { src: string; alt: string; spread?: 'left' | 'right' }

function createPages(landscape: boolean[]): PageFlipLeaf[] {
  const faces: BookFace[] = [photos[0]]
  photos.forEach((photo, index) => {
    if (landscape[index]) {
      // An open spread is the back of one leaf and the front of the next.
      if (faces.length % 2 === 0) faces.push(faces[faces.length - 1])
      faces.push({ ...photo, spread: 'left' }, { ...photo, spread: 'right' })
    } else {
      faces.push(photo)
    }
  })
  if (faces.length % 2) faces.push(photos[photos.length - 1])
  return Array.from({ length: faces.length / 2 }, (_, index) => {
    const front = faces[index * 2]
    const back = faces[index * 2 + 1]
    return {
      id: index,
      frontImage: front.src,
      backImage: back.src,
      frontAlt: front.alt,
      backAlt: back.alt,
      frontSpread: front.spread,
      backSpread: back.spread,
    }
  })
}

export default function YearOnePictureBook() {
  const [pages, setPages] = useState<PageFlipLeaf[]>([])
  const stage = useRef<HTMLDivElement>(null)
  const [pageWidth, setPageWidth] = useState(230)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all(photos.map(photo => new Promise<boolean>(resolve => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth > image.naturalHeight)
      image.onerror = () => resolve(false)
      image.src = photo.src
    }))).then(landscape => {
      if (!cancelled) setPages(createPages(landscape))
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.min(540, Math.max(100, (entry.contentRect.width - 40) / 2)))
    })
    observer.observe(element)
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', update)
    }
  }, [])

  return <section className="section chapter-section year-one-pictures" id="pictures" aria-labelledby="pictures-title">
    <div className="container picture-book-layout">
      <div className="picture-book-copy">
        <p className="eyebrow">2025 to 2026</p>
        <h2 id="pictures-title">Year one in pictures</h2>
        <p>Student pitches, conversations around the tables, and a community coming together for Windsor’s first Hult Prize campus round.</p>
        <p>Take a look back at the people and moments that made our first year.</p>
        <p className="picture-book-hint">Click a page to turn it.</p>
      </div>
      <div ref={stage} className="picture-book-stage" role="region" aria-label="Hult Prize in pictures">
        {pages.length > 0 && <ThreeDImagePageflip
          pages={pages}
          showPageNumbers={false}
          showControls={false}
          keepOpen
          defaultTurnedIndex={1}
          pageWidth={pageWidth}
          pageHeight={Math.round(pageWidth * 1.43)}
          shadowIntensity={0}
          accentColor="#ffb4df"
          duration={reducedMotion ? 0 : 0.65}
          peekAngle={reducedMotion ? 0 : 14}
        />}
      </div>
    </div>
  </section>
}
