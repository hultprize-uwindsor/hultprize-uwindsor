import { RevealText } from './MotionText'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ThreeDImagePageflip, type PageFlipLeaf, type ThreeDImagePageflipHandle } from '../lightswind/ThreeDImagePageflip'
import { CAMPUS_PHOTOS, YEAR_ONE_PHOTOS } from '../data/assets'
import './YearOnePictureBook.css'

const photos = [CAMPUS_PHOTOS.room, ...YEAR_ONE_PHOTOS]
type BookFace = { src: string; alt: string; spread?: 'left' | 'right' }

function createPages(landscape: boolean[]): PageFlipLeaf[] {
  // Each photo is described once; repeated faces (pinned cover, spread halves, padding) get empty alt.
  const faces: BookFace[] = [{ ...photos[0], alt: '' }]
  photos.forEach((photo, index) => {
    if (landscape[index]) {
      // An open spread is the back of one leaf and the front of the next.
      if (faces.length % 2 === 0) faces.push({ ...faces[faces.length - 1], alt: '' })
      faces.push({ ...photo, spread: 'left' }, { ...photo, spread: 'right', alt: '' })
    } else {
      faces.push(photo)
    }
  })
  if (faces.length % 2) faces.push({ ...photos[photos.length - 1], alt: '' })
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
  const book = useRef<ThreeDImagePageflipHandle>(null)
  // keepOpen pins the first and last leaves, so turning runs from leaf 1 to leaf length - 1.
  const [turned, setTurned] = useState(1)
  const [pageWidth, setPageWidth] = useState(230)
  const [reducedMotion, setReducedMotion] = useState(false)
  const pageHeight = Math.round(pageWidth * 1.43)

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

  // Measured before the first paint, so the reserved space is right from the first frame and the copy beside it never jumps.
  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    // About 12% smaller than filling the stage, so the book sits with some room around it. The stage has no padding.
    const fit = (width: number) => setPageWidth(Math.min(475, Math.max(100, (width - 40) / 2 * 0.88)))
    fit(element.clientWidth)
    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width))
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
        <h2 id="pictures-title" data-text-reveal><RevealText>Year one in pictures</RevealText></h2>
        <p>Photos from Windsor’s first campus round: teams, pitches and judges.</p>
        <p className="picture-book-hint">Click a page, or use the buttons, to turn it.</p>
      </div>
      {/* Arrow keys turn pages only while focus is in the book; clicking a page focuses it. */}
      {/* Holds the book's space while its photos load: page + 40 stage + 48 padding, then 24 + 48 for the buttons. */}
      <div ref={stage} className="picture-book-stage" style={{ minHeight: pageHeight + 160 }} role="region" aria-label="Hult Prize in pictures" tabIndex={-1} onKeyDown={e => {
        if (e.key === 'ArrowRight' && turned < pages.length - 1) book.current?.next()
        if (e.key === 'ArrowLeft' && turned > 1) book.current?.prev()
      }}>
        {pages.length > 0 && <ThreeDImagePageflip
          ref={book}
          pages={pages}
          onPageChange={setTurned}
          showPageNumbers={false}
          showControls={false}
          keyboardNavigation={false}
          keepOpen
          defaultTurnedIndex={1}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          shadowIntensity={0}
          accentColor="#ffb4df"
          duration={reducedMotion ? 0 : 0.65}
          peekAngle={reducedMotion ? 0 : 14}
        />}
        {/* aria-disabled rather than disabled, so focus stays on a button that reaches the end. */}
        {pages.length > 0 && <div className="picture-book-controls">
          <button type="button" className="btn btn--secondary" onClick={() => { if (turned > 1) book.current?.prev() }} aria-disabled={turned <= 1}>Previous page</button>
          <button type="button" className="btn btn--secondary" onClick={() => { if (turned < pages.length - 1) book.current?.next() }} aria-disabled={turned >= pages.length - 1}>Next page</button>
          <p className="visually-hidden" aria-live="polite">Spread {turned} of {pages.length - 1}</p>
        </div>}
      </div>
    </div>
  </section>
}
