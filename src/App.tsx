import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { PartnerStrip } from './components/PartnerShowcase'
import HomePage from './pages/HomePage'
import { AboutPage, YearOnePage, ThisYearPage, CompetePage, PartnersPage, ContactPage } from './pages/ChapterPages'
import EventsPage, { EventPostPage, NotFoundPage } from './pages/EventsPage'
import GoRedirect from './pages/GoRedirect'
import './chapter.css'
import './motion.css'
import useSiteMotion from './hooks/useSiteMotion'

const titles: Record<string, string> = { '/': 'Home', '/about': 'About', '/year-one': 'Year one', '/this-year': 'This year', '/events': 'Events', '/compete': 'Compete', '/partners': 'Partners', '/contact': 'Find us' }
export default function App() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    document.title = `${titles[pathname] ?? 'Events'} | Hult Prize at the University of Windsor`
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) target.scrollIntoView({ block: 'start', behavior: 'instant' })
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  useSiteMotion(pathname)
  return <><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main" tabIndex={-1}><Routes>
    <Route path="/" element={hash === '#signup' ? <Navigate to="/compete#signup" replace /> : <HomePage />} />
    <Route path="/about" element={<AboutPage />} /><Route path="/year-one" element={<YearOnePage />} /><Route path="/this-year" element={<ThisYearPage />} />
    <Route path="/events" element={<EventsPage />} /><Route path="/events/:slug" element={<EventPostPage />} /><Route path="/compete" element={<CompetePage />} /><Route path="/partners" element={<PartnersPage />} /><Route path="/contact" element={<ContactPage />} />
    <Route path="/team" element={<Navigate to="/about#team" replace />} /><Route path="/go" element={<GoRedirect />} /><Route path="*" element={<NotFoundPage />} />
  </Routes></main><PartnerStrip /><Footer /></>
}
