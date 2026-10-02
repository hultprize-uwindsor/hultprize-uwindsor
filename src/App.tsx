import { useLayoutEffect, useRef } from 'react'
import { Routes, Route, useLocation, useNavigationType, Navigate } from 'react-router-dom'
import Header from './components/Header'
import PageMeta from './components/PageMeta'
import SiteDrawers from './components/SiteDrawers'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import { useReveals } from './components/useReveals'
import { scrollPageTo, useSmoothScroll } from './components/useSmoothScroll'
import { PartnerStrip } from './components/PartnerShowcase'
import { SHOW_PARTNER_STRIP } from './data/partners'
import HomePage from './pages/HomePage'
import { AboutPage, YearOnePage, ThisYearPage, CompetePage, PartnersPage } from './pages/ChapterPages'
import ContactPage from './pages/ContactPage'
import EventsPage, { EventPostPage, NotFoundPage } from './pages/EventsPage'
import GoRedirect from './pages/GoRedirect'
import PartnerPage from './pages/PartnerPage'
import './chapter.css'
import './motion.css'
import './experience-motion.css'

export default function App() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()
  useSmoothScroll()
  const main = useRef<HTMLElement>(null)
  const positions = useRef(new Map<string, number>())
  const previousPage = useRef({ pathname, hash })
  useLayoutEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => { history.scrollRestoration = previous }
  }, [])
  useLayoutEffect(() => {
    const changed = previousPage.current.pathname !== pathname || previousPage.current.hash !== hash
    const saved = positions.current.get(key)
    if (navigationType === 'POP' && saved !== undefined) {
      scrollPageTo(saved, true)
    } else if (changed || positions.current.size === 0) {
      const target = hash ? document.getElementById(hash.slice(1)) : null
      if (target) scrollPageTo(target.getBoundingClientRect().top + window.scrollY - 28, true)
      else scrollPageTo(0, true)
    }
    if (previousPage.current.pathname !== pathname) main.current?.focus({ preventScroll: true })
    previousPage.current = { pathname, hash }
    const save = () => { positions.current.set(key, window.scrollY) }
    save()
    window.addEventListener('scroll', save, { passive: true })
    return () => { window.removeEventListener('scroll', save) }
  }, [pathname, hash, key, navigationType])
  useReveals(pathname, hash)
  return <><PageMeta /><a href="#main" className="skip-link">Skip to main content</a><Header /><main ref={main} id="main" tabIndex={-1}><Routes>
    <Route path="/" element={hash === '#signup' ? <Navigate to="/compete#signup" replace /> : <HomePage />} />
    <Route path="/about" element={<AboutPage />} /><Route path="/year-one" element={<YearOnePage />} /><Route path="/this-year" element={<ThisYearPage />} />
    <Route path="/events" element={<EventsPage />} /><Route path="/events/:slug" element={<EventPostPage />} /><Route path="/compete" element={<CompetePage />} /><Route path="/partners" element={<PartnersPage />} /><Route path="/partners/:slug" element={<PartnerPage />} /><Route path="/contact" element={<ContactPage />} />
    <Route path="/team" element={<Navigate to="/about#team" replace />} /><Route path="/go" element={<GoRedirect />} /><Route path="*" element={<NotFoundPage />} />
  </Routes></main>{SHOW_PARTNER_STRIP && <PartnerStrip />}<Footer /><ScrollToTop /><SiteDrawers /></>
}
