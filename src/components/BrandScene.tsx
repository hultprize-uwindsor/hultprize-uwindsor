import { useEffect, useRef, type CSSProperties } from 'react'
import { createBrandRenderer } from './brandSceneRenderer'
import './BrandScene.css'

/** A continuous, dimensional wave. Original geometry; no borrowed footage. */
export default function BrandScene({ variant = 'pink', active = true }: { variant?: 'pink' | 'blue'; active?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)

  useEffect(() => {
    const element = root.current
    const surface = canvas.current
    if (!element || !surface) return
    const renderer = createBrandRenderer(surface, variant)
    if (!renderer) return
    element.dataset.renderer = 'webgl'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let frame = 0
    let previous = 0
    let seconds = .9
    let width = element.clientWidth
    let height = element.clientHeight
    let lost = false

    const draw = () => {
      if (lost || !activeRef.current || !width || !height) return
      const scroll = reduce.matches ? 0 : Math.max(0, Math.min(1, -element.getBoundingClientRect().top / height))
      renderer.render(seconds, scroll, width, height)
    }
    const animate = (now: number) => {
      frame = 0
      if (!visible || !activeRef.current || document.hidden || lost) { previous = 0; return }
      if (previous && !reduce.matches) seconds += Math.min((now - previous) / 1000, .05)
      previous = now
      draw()
      if (!reduce.matches) frame = requestAnimationFrame(animate)
      else previous = 0
    }
    const resume = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      if (visible && activeRef.current && !document.hidden && !lost) frame = requestAnimationFrame(animate)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      element.classList.toggle('brand-scene--offscreen', !visible)
      resume()
    })
    observer.observe(element)
    const resize = new ResizeObserver(() => {
      width = element.clientWidth
      height = element.clientHeight
      if (visible) draw()
    })
    resize.observe(element)
    const onContextLost = (event: Event) => {
      event.preventDefault()
      lost = true
      delete element.dataset.renderer
      if (frame) cancelAnimationFrame(frame)
    }
    surface.addEventListener('webglcontextlost', onContextLost)
    element.addEventListener('brand-motion-toggle', resume)
    document.addEventListener('visibilitychange', resume)
    reduce.addEventListener('change', resume)
    draw()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      resize.disconnect()
      surface.removeEventListener('webglcontextlost', onContextLost)
      element.removeEventListener('brand-motion-toggle', resume)
      document.removeEventListener('visibilitychange', resume)
      reduce.removeEventListener('change', resume)
      renderer.destroy()
      delete element.dataset.renderer
    }
  }, [variant])

  useEffect(() => {
    activeRef.current = active
    root.current?.dispatchEvent(new Event('brand-motion-toggle'))
  }, [active])

  return <div ref={root} className={`brand-scene brand-scene--${variant}`}>
    <div className="brand-scene__art" aria-hidden="true">
      <div className="brand-scene__fallback">{Array.from({ length: 15 }, (_, index) => <span key={index} className="brand-scene__disc" style={{ '--disc': index } as CSSProperties} />)}</div>
      <canvas ref={canvas} className="brand-scene__canvas" />
      <span className="brand-scene__light" />
    </div>
  </div>
}
