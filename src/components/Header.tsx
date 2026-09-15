import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import './Header.css'

const NAV_LINKS = [
  { to: '/', label: 'Sign Up', end: true },
  { to: '/team', label: 'Our Team', end: true },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  // Close the mobile menu whenever the route changes size class (simple safety net)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 720) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <header className="site-header">
      <div className="uw-strip" aria-hidden="true" />
      <div className="container site-header__inner">
        <NavLink to="/" className="site-header__brand" onClick={() => setOpen(false)}>
          <img
            src="/images/hultprize-logo.svg"
            alt="Hult Prize"
            className="site-header__logo"
          />
          <span className="site-header__divider" aria-hidden="true" />
          <span className="site-header__school">University of Windsor</span>
        </NavLink>

        <button
          className="site-header__toggle"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`site-header__nav ${open ? 'is-open' : ''}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `site-header__link ${isActive ? 'is-active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <a href="/#signup" className="btn btn--primary site-header__cta" onClick={() => setOpen(false)}>
            Join the team
          </a>
        </nav>
      </div>
    </header>
  )
}
