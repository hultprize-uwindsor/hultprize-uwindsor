import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import './Header.css'

export default function Header() {
  const location = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const open = openAt === location.key
  const closeMenu = () => setOpenAt(null)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 960) setOpenAt(null)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <div className="site-announcement">
        <Link to="/#signup">
          Hult Prize at the University of Windsor
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <header
        className="site-header"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            closeMenu()
            toggleRef.current?.focus()
          }
        }}
      >
        <div className="container site-header__inner">
          <Link
            to="/"
            className="site-header__brand"
            aria-label="Hult Prize at the University of Windsor home"
            onClick={closeMenu}
          >
            <img
              src="/images/logos/Hult Prize logos Horizontal White.png"
              alt="Hult Prize"
              width="184"
              height="42"
              className="site-header__logo"
            />
          </Link>

          <button
            ref={toggleRef}
            type="button"
            className="site-header__toggle"
            aria-expanded={open}
            aria-controls="site-navigation"
            onClick={() => setOpenAt(open ? null : location.key)}
          >
            {open ? 'Close' : 'Menu'}
          </button>

          <nav
            id="site-navigation"
            aria-label="Main navigation"
            className={`site-header__nav ${open ? 'is-open' : ''}`}
          >
            <Link to="/#what-you-win" className="site-header__link" onClick={closeMenu}>
              The competition
            </Link>
            <Link to="/#key-dates" className="site-header__link" onClick={closeMenu}>
              Key dates
            </Link>
            <NavLink
              to="/team"
              className={({ isActive }) => `site-header__link ${isActive ? 'is-active' : ''}`}
              onClick={closeMenu}
            >
              Our team
            </NavLink>
            <Link to="#contact" className="site-header__link" onClick={closeMenu}>
              Contact
            </Link>
            <Link to="/#signup" className="btn site-header__cta" onClick={closeMenu}>
              Register to compete
            </Link>
          </nav>
        </div>
      </header>
    </>
  )
}
