import { useEffect, useRef } from 'react'

// Deliberately exclude the book, moving partner rows, existing timeline reveals,
// statistics and form fields: they already have motion or need to remain stable.
const targets = [
  '.chapter-section > .container > .eyebrow',
  '.chapter-section > .container > h2',
  '.chapter-section > .container > .prose',
  '.photo-copy-grid > .prose',
  '.entry-card', '.team-tree__card', '.tier-card', '.post-card',
  '.timeline--full > li', '.entry-steps > li', '.callout',
  '.contact-grid > div', '.picture-book-copy',
  '.site-footer__display-wordmark',
].join(',')
const staggered = '.entry-card, .team-tree__card, .tier-card, .post-card, .entry-steps > li'

export default function useSiteMotion(pathname: string) {
  const revealed = useRef(new WeakSet<Element>())
  useEffect(() => {
    const main = document.querySelector('main')
    const footer = document.querySelector('.site-footer')
    if (!main) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pending = new Set<Element>()
    const animations = new Map<Element, Animation>()
    const play = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(frames, options)
      animations.set(element, animation)
      animation.onfinish = () => animations.delete(element)
    }
    const reveal = (element: Element, immediate = false) => {
      observer?.unobserve(element)
      pending.delete(element)
      element.removeAttribute('data-motion-pending')
      revealed.current.add(element)
      if (immediate || media.matches) {
        animations.get(element)?.cancel()
        animations.delete(element)
        return
      }
      const siblings = element.parentElement ? [...element.parentElement.children] : []
      const delay = element.matches(staggered) ? Math.min(siblings.indexOf(element), 3) * 60 : 0
      play(element, [{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], {
        duration: 480, delay, fill: 'backwards', easing: 'cubic-bezier(.22, 1, .36, 1)',
      })
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target) })
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }) : null
    const register = (element: Element) => {
      if (revealed.current.has(element) || pending.has(element)) return
      if (!observer || media.matches) { revealed.current.add(element); return }
      // Above-the-fold content gets the page fade, without stacked entrances.
      const bounds = element.getBoundingClientRect()
      if (bounds.top < innerHeight - 24 && bounds.bottom > 0) { revealed.current.add(element); return }
      element.setAttribute('data-motion-pending', '')
      pending.add(element)
      observer.observe(element)
    }
    const scan = (root: Element) => {
      if (root.matches(targets)) register(root)
      root.querySelectorAll(targets).forEach(register)
    }
    scan(main)
    if (footer) scan(footer)
    if (!media.matches) play(main, [{ opacity: 0, translate: '0 20px' }, { opacity: 1, translate: '0 0' }], { duration: 500, easing: 'cubic-bezier(.22, 1, .36, 1)' })
    const changes = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) scan(node) }))
    })
    changes.observe(main, { childList: true, subtree: true })
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return
      for (const element of [...pending, ...animations.keys()]) {
        if (element.contains(event.target)) reveal(element, true)
      }
    }
    const preferenceChanged = () => {
      if (!media.matches) return
      pending.forEach(element => reveal(element, true))
      animations.forEach(animation => animation.cancel())
      animations.clear()
    }
    document.addEventListener('focusin', focus)
    media.addEventListener('change', preferenceChanged)
    return () => {
      observer?.disconnect()
      changes.disconnect()
      pending.forEach(element => element.removeAttribute('data-motion-pending'))
      animations.forEach(animation => animation.cancel())
      document.removeEventListener('focusin', focus)
      media.removeEventListener('change', preferenceChanged)
    }
  }, [pathname])
}
