import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

let scrolling: Lenis | undefined

/** The same native-scroll engine used by the reference; no translated page wrapper. */
export function scrollPageTo(top: number, immediate = false) {
  if (scrolling) { if (immediate) scrolling.resize(); scrolling.scrollTo(top, { immediate, force: true }) }
  else window.scrollTo({ top, behavior: immediate || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}

export function useSmoothScroll() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const syncLock = () => {
      if (document.body.style.overflow === 'hidden') scrolling?.stop()
      else scrolling?.start()
    }
    const setup = () => {
      scrolling?.destroy()
      scrolling = undefined
      if (reduced.matches) return
      scrolling = new Lenis({ autoRaf: true, lerp: .1, smoothWheel: true, syncTouch: false, prevent: node => !!node.closest('dialog, [data-lenis-prevent]') })
      syncLock()
    }
    setup()
    reduced.addEventListener('change', setup)
    const lock = new MutationObserver(syncLock)
    lock.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    return () => { lock.disconnect(); reduced.removeEventListener('change', setup); scrolling?.destroy(); scrolling = undefined }
  }, [])
}
