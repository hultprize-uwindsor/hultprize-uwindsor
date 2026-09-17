import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import TeamPage from './pages/TeamPage'
import GoRedirect from './pages/GoRedirect'

export default function App() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname, hash])

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/go" element={<GoRedirect />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
