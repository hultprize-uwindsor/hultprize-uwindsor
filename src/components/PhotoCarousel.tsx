import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import './PhotoCarousel.css'

export type PhotoSlide = {
  src: string
  alt: string
  caption: string
}

type PhotoCarouselProps = {
  slides: PhotoSlide[]
  variant?: 'default' | 'panorama'
}

const MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export default function PhotoCarousel({ slides, variant = 'default' }: PhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [documentHidden, setDocumentHidden] = useState(() => document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia(MOTION_QUERY).matches)
  const [motionOptIn, setMotionOptIn] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const slideCount = slides.length
  const currentIndex = slideCount ? activeIndex % slideCount : 0
  const autoplayEnabled = !paused && (!reducedMotion || motionOptIn)

  useEffect(() => {
    const media = window.matchMedia(MOTION_QUERY)
    const onMotionChange = () => {
      setReducedMotion(media.matches)
      setMotionOptIn(false)
    }
    const onVisibilityChange = () => setDocumentHidden(document.hidden)

    media.addEventListener('change', onMotionChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      media.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (slideCount < 2 || !autoplayEnabled || hovered || focused || documentHidden) return

    const timer = window.setTimeout(() => {
      setActiveIndex((index) => (index + 1) % slideCount)
    }, 7000)
    return () => window.clearTimeout(timer)
  }, [activeIndex, autoplayEnabled, documentHidden, focused, hovered, slideCount])

  const moveSlide = (direction: number) => {
    if (slideCount < 2) return
    const nextIndex = (currentIndex + direction + slideCount) % slideCount
    setActiveIndex(nextIndex)
    setAnnouncement(`Image ${nextIndex + 1} of ${slideCount}: ${slides[nextIndex].caption}`)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    moveSlide(event.key === 'ArrowRight' ? 1 : -1)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return
    touchStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return

    const horizontalDistance = event.clientX - start.x
    const verticalDistance = event.clientY - start.y
    if (Math.abs(horizontalDistance) >= 50 && Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.25) {
      moveSlide(horizontalDistance < 0 ? 1 : -1)
    }
  }

  const toggleAutoplay = () => {
    if (autoplayEnabled) {
      setPaused(true)
    } else {
      setPaused(false)
      setMotionOptIn(true)
    }
  }

  if (!slideCount) return null

  return (
    <div
      className={`photo-carousel${variant === 'panorama' ? ' photo-carousel--panorama' : ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hult Prize in pictures"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="photo-carousel__frame"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { touchStart.current = null }}
        aria-live="off"
      >
        {slides.map((slide, index) => (
          <div
            className={`photo-carousel__slide${index === currentIndex ? ' is-active' : ''}`}
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slideCount}: ${slide.caption}`}
            aria-hidden={index !== currentIndex}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              width="1200"
              height="900"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'low'}
              decoding="async"
              draggable="false"
            />
          </div>
        ))}
      </div>

      <p className="photo-carousel__announcement" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div className="photo-carousel__footer">
        <p className="photo-carousel__caption" aria-live="off">{slides[currentIndex].caption}</p>
        {slideCount > 1 && (
          <div className="photo-carousel__controls" aria-label="Slideshow controls">
            <span className="photo-carousel__count" aria-hidden="true">
              <span>{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="photo-carousel__total"> / {String(slideCount).padStart(2, '0')}</span>
            </span>
            <button type="button" className="photo-carousel__control" aria-label="Previous image" onClick={() => moveSlide(-1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M19 12H5m6-6-6 6 6 6" />
              </svg>
            </button>
            <button type="button" className="photo-carousel__control" aria-label={autoplayEnabled ? 'Pause slideshow' : 'Play slideshow'} onClick={toggleAutoplay}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {autoplayEnabled ? <path d="M8 6h2.5v12H8zm5.5 0H16v12h-2.5z" /> : <path d="m9 5 11 7-11 7z" />}
              </svg>
            </button>
            <button type="button" className="photo-carousel__control" aria-label="Next image" onClick={() => moveSlide(1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
