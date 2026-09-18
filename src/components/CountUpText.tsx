import { useEffect, useRef, useState } from 'react'
import './CountUpText.css'

export default function CountUpText({ value }: { value: string }) {
  const element = useRef<HTMLSpanElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const target = element.current
    if (!target || !/\d/.test(value)) return
    let frame = 0
    let started = false
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => {
      if (preference.matches) {
        cancelAnimationFrame(frame)
        setProgress(1)
      }
    }
    const observer = new IntersectionObserver(entries => {
      if (started || !entries.some(entry => entry.isIntersecting)) return
      started = true
      observer.disconnect()
      if (preference.matches) { setProgress(1); return }
      const start = performance.now()
      const tick = (now: number) => {
        const elapsed = Math.min(1, (now - start) / 1600)
        setProgress(1 - Math.pow(1 - elapsed, 3))
        if (elapsed < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.25 })
    setProgress(preference.matches ? 1 : 0)
    observer.observe(target)
    preference.addEventListener('change', finish)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      preference.removeEventListener('change', finish)
    }
  }, [value])

  if (!/\d/.test(value)) return value
  const animated = progress === 1 ? value : value.replace(/\d[\d,]*(?:\.\d+)?/g, token => {
    const places = token.split('.')[1]?.length ?? 0
    const number = Math.floor(Number(token.replaceAll(',', '')) * progress * 10 ** places) / 10 ** places
    return number.toLocaleString('en-CA', { useGrouping: token.includes(','), minimumFractionDigits: places, maximumFractionDigits: places })
  })
  return <span ref={element} className="count-up" data-count-up={value}>
    <span className="count-up__reserve" aria-hidden="true">{value}</span>
    <span className="count-up__value" aria-hidden="true">{animated}</span>
    <span className="count-up__accessible">{value}</span>
  </span>
}
