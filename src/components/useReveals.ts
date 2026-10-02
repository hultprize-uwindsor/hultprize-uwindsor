import { useEffect } from 'react'
import { FADE_IN_ON_LOAD, REVEAL_ON_SCROLL } from '../data/site'

/** Character curtains and individual card entrances, measured at the reference. */
export function useReveals(pathname: string, _hash: string) {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const animations: Animation[] = []
    let observer: IntersectionObserver | undefined
    const targets = [...document.querySelectorAll<HTMLElement>('main [data-text-reveal], .site-footer [data-text-reveal], main .page-heading__intro, main .home-hero__aside, main .home-hero .eyebrow, main .person-tile, main .partner-tile, main .season-gallery__grid > a, main .stat-band > div, main .timeline > li, main .eligibility-card, main .tier-card')]
    const arrive = (el: HTMLElement, delay = 0) => {
      if (el.dataset.motion === 'done') return
      el.dataset.motion = 'done'
      if (el.hasAttribute('data-text-reveal')) return
      animations.push(el.animate([{ opacity: 0, transform: 'translate3d(0,48px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 900, delay, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' }))
    }
    const setup = () => {
      observer?.disconnect()
      if (reduced.matches) { targets.forEach(el => el.dataset.motion = 'done'); animations.forEach(animation => animation.cancel()); return }
      if (!REVEAL_ON_SCROLL) return
      observer = new IntersectionObserver(entries => {
        let index = 0
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return
          arrive(target as HTMLElement, index++ * 65)
          observer?.unobserve(target)
        })
      }, { rootMargin: '0px 0px -8% 0px' })
      targets.forEach(el => {
        if (el.dataset.motion === 'done') return
        const rect = el.getBoundingClientRect()
        if (rect.bottom < 0 || (rect.top < innerHeight && !FADE_IN_ON_LOAD)) { el.dataset.motion = 'done'; return }
        el.dataset.motion = 'waiting'
        observer?.observe(el)
      })
    }
    const focus = (event: FocusEvent) => {
      const el = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-motion="waiting"]') : null
      if (el) { el.dataset.motion = 'done'; observer?.unobserve(el) }
    }
    setup(); reduced.addEventListener('change', setup); document.addEventListener('focusin', focus)
    return () => { observer?.disconnect(); animations.forEach(animation => animation.cancel()); reduced.removeEventListener('change', setup); document.removeEventListener('focusin', focus) }
  }, [pathname])
}
