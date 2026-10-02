import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import './ScrollToTop.css'
import { scrollPageTo } from './useSmoothScroll'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    document.getElementById('main')?.focus({ preventScroll: true })
    scrollPageTo(0)
  }

  return visible ? <button type="button" className="scroll-to-top" onClick={scrollToTop} aria-label="Scroll to top" title="Scroll to top"><ArrowUp size={22} aria-hidden="true" /></button> : null
}
