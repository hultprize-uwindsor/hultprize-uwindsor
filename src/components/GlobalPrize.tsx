import { useEffect, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'
import PrizeCoins from './PrizeCoins'
import { RevealText } from './MotionText'
import './GlobalPrize.css'

export function GlobalPrize() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const badge = section?.querySelector('.global-prize__eyebrow')
    if (!section || !badge) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { section.dataset.prizeEntered = 'true'; observer.disconnect() }
    }, { threshold: 1, rootMargin: '0px 0px -10% 0px' })
    observer.observe(badge)
    return () => observer.disconnect()
  }, [])

  return <section className="global-prize" id="global-prize" aria-labelledby="global-prize-title" ref={sectionRef}>
    <PrizeCoins />
    <div className="global-prize__content">
      <span className="global-prize__eyebrow">The global prize<svg aria-hidden="true" viewBox="0 0 140 30" preserveAspectRatio="none"><rect x=".75" y=".75" width="138.5" height="28.5" rx="14.25" pathLength="1" /></svg></span>
      <h2 id="global-prize-title" aria-label="1 million US dollars" data-text-reveal><span className="global-prize__million"><RevealText>$1M</RevealText></span><span className="global-prize__usd"><RevealText>USD</RevealText></span></h2>
      <p className="global-prize__intro">Seed funding for one winning startup.</p>
      <a className="global-prize__terms" href="https://www.hultprize.org/terms-conditions" target="_blank" rel="noopener noreferrer">Prize terms <ArrowUpRight size={14} /></a>
    </div>
  </section>
}
