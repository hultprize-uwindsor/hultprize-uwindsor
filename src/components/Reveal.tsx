import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './Reveal.css'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const revealedRef = useRef(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element || !('IntersectionObserver' in window) || !window.matchMedia) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

    const observe = () => {
      observerRef.current?.disconnect()
      if (revealedRef.current || motionPreference.matches) return

      observerRef.current = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return

        observerRef.current?.disconnect()
        if (revealedRef.current) return
        revealedRef.current = true

        if (!motionPreference.matches && !element.contains(document.activeElement)) {
          setAnimating(true)
        }
      }, { threshold: 0, rootMargin: '0px 0px -24px 0px' })

      observerRef.current.observe(element)
    }

    const handleMotionChange = () => {
      if (motionPreference.matches) setAnimating(false)
      observe()
    }

    observe()
    motionPreference.addEventListener('change', handleMotionChange)
    return () => {
      observerRef.current?.disconnect()
      motionPreference.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return (
    <div
      ref={elementRef}
      className={`reveal${animating ? ' reveal--animating' : ''}${className ? ` ${className}` : ''}`}
      style={{ animationDelay: `${Number.isFinite(delay) ? Math.max(0, delay) : 0}ms` }}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setAnimating(false)
      }}
      onFocusCapture={() => {
        revealedRef.current = true
        observerRef.current?.disconnect()
        setAnimating(false)
      }}
    >
      {children}
    </div>
  )
}
