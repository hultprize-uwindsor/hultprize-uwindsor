import { Children, createContext, useContext, useEffect, useMemo, useRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import './ThreeDScrollTrigger.css'

// Adapted from the ThreeDScrollTrigger component supplied by the user.
// Keep motion in refs and DOM transforms, without per-frame React renders.
const ScrollVelocityContext = createContext<{ getVelocity: () => number }>({ getVelocity: () => 0 })

export function ThreeDScrollTriggerContainer({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  const velocity = useRef(0)
  useEffect(() => {
    let lastY = window.scrollY
    let lastTime = performance.now()
    let decay: ReturnType<typeof setTimeout> | undefined
    const handleScroll = () => {
      const now = performance.now()
      const dt = now - lastTime
      if (dt <= 0) return
      velocity.current = Math.max(-2500, Math.min(2500, ((window.scrollY - lastY) / Math.max(6, dt)) * 1000))
      lastY = window.scrollY
      lastTime = now
      clearTimeout(decay)
      decay = setTimeout(() => { velocity.current = 0 }, 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(decay)
    }
  }, [])
  const context = useMemo(() => ({ getVelocity: () => velocity.current }), [])
  return <ScrollVelocityContext.Provider value={context}><div className={`three-d-scroll ${className}`} {...props}>{children}</div></ScrollVelocityContext.Provider>
}

interface ThreeDScrollTriggerRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  baseVelocity?: number
  direction?: 1 | -1
  tiltEffect?: boolean
  paused?: boolean
}

export function ThreeDScrollTriggerRow({ children, baseVelocity = 5, direction = 1, tiltEffect = true, paused = false, className = '', ...props }: ThreeDScrollTriggerRowProps) {
  const context = useContext(ScrollVelocityContext)
  const rowRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const x = useRef(0)
  const hover = useRef(false)
  const focus = useRef(false)
  const manualPause = useRef(paused)
  const startAnimation = useRef<(() => void) | null>(null)
  const stopAnimation = useRef<(() => void) | null>(null)
  const items = useMemo(() => Children.toArray(children), [children])

  useEffect(() => {
    manualPause.current = paused
    if (paused) stopAnimation.current?.()
    else startAnimation.current?.()
  }, [paused])

  useEffect(() => {
    const row = rowRef.current
    const track = trackRef.current
    const block = blockRef.current
    if (!row || !track || !block) return
    let frame: number | null = null
    let unitWidth = 0
    let inView = typeof IntersectionObserver === 'undefined'
    let smoothVelocity = 0
    let smoothTilt = 0
    let lastTime = performance.now()
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
    }
    const canAnimate = () => inView && !document.hidden && !media.matches && !manualPause.current && !hover.current && !focus.current
    const animate = (now: number) => {
      frame = null
      if (!canAnimate()) return
      const dt = Math.min(.04, Math.max(.001, (now - lastTime) / 1000))
      lastTime = now
      smoothVelocity += (context.getVelocity() - smoothVelocity) * (1 - Math.exp(-12 * dt))
      if (unitWidth > 0) {
        const baseSpeed = Math.abs(baseVelocity) * 26
        const scrollBoost = Math.abs(smoothVelocity) * .45
        const scrollDirection = smoothVelocity < -30 ? -1 : 1
        const currentSpeed = direction * scrollDirection * (baseSpeed + scrollBoost)
        x.current = ((x.current + currentSpeed * dt) % unitWidth + unitWidth) % unitWidth
        let tilt = ''
        if (tiltEffect) {
          const targetTilt = Math.max(-4.5, Math.min(4.5, (currentSpeed / 200) * 1.8))
          smoothTilt += (targetTilt - smoothTilt) * (1 - Math.exp(-14 * dt))
          tilt = ` skewX(${-smoothTilt}deg)`
        }
        track.style.transform = `translate3d(${-x.current}px, 0, 0)${tilt}`
      }
      frame = requestAnimationFrame(animate)
    }
    const start = () => {
      if (frame !== null || !canAnimate()) return
      lastTime = performance.now()
      frame = requestAnimationFrame(animate)
    }
    startAnimation.current = start
    stopAnimation.current = stop
    const measure = () => {
      // offsetWidth stays stable while the track is skewed.
      unitWidth = block.offsetWidth
      if (unitWidth > 0) x.current %= unitWidth
    }
    measure()
    const resize = new ResizeObserver(measure)
    resize.observe(block)
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView) start()
      else stop()
    }, { rootMargin: '250px' })
    intersection?.observe(row)
    const updatePreference = () => {
      stop()
      if (media.matches) {
        track.style.transform = 'none'
        x.current = 0
        smoothVelocity = 0
        smoothTilt = 0
      } else start()
    }
    const updateVisibility = () => { if (document.hidden) stop(); else start() }
    media.addEventListener('change', updatePreference)
    document.addEventListener('visibilitychange', updateVisibility)
    // Clones stay clickable, but are omitted from keyboard and screen-reader navigation.
    track.querySelectorAll<HTMLElement>('[data-clone] a, [data-clone] button, [data-clone] [tabindex]').forEach(element => { element.tabIndex = -1 })
    updatePreference()
    return () => {
      stop()
      resize.disconnect()
      intersection?.disconnect()
      media.removeEventListener('change', updatePreference)
      document.removeEventListener('visibilitychange', updateVisibility)
      startAnimation.current = null
      stopAnimation.current = null
    }
  }, [baseVelocity, direction, tiltEffect, context, items])

  return (
    <div {...props} ref={rowRef} className={`three-d-row ${className}`}
      onPointerEnter={event => {
        if (event.pointerType === 'mouse') { hover.current = true; stopAnimation.current?.() }
        props.onPointerEnter?.(event)
      }}
      onPointerLeave={event => { hover.current = false; startAnimation.current?.(); props.onPointerLeave?.(event) }}
      onMouseDownCapture={event => {
        // Keep a clicked moving link in place; keyboard focus still reveals the static list.
        if (event.target instanceof Element && event.target.closest('a')) event.preventDefault()
        props.onMouseDownCapture?.(event)
      }}
      onFocusCapture={event => {
        focus.current = true
        stopAnimation.current?.()
        // Present the original block as a stationary horizontal list for keyboard use.
        if (trackRef.current) trackRef.current.style.transform = 'none'
        props.onFocusCapture?.(event)
      }}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focus.current = false
          event.currentTarget.scrollLeft = 0
          startAnimation.current?.()
        }
        props.onBlurCapture?.(event)
      }}
    >
      <div ref={trackRef} className="three-d-track">
        <div ref={blockRef} className="three-d-block">{items}</div>
        {[1, 2, 3].map(clone => <div key={clone} className="three-d-block" data-clone aria-hidden="true">{items}</div>)}
      </div>
    </div>
  )
}
