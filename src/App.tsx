import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import TeamPage from './pages/TeamPage'
import GoRedirect from './pages/GoRedirect'

export default function App() {
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
