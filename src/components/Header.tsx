import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { RegisterButton } from './PageParts'
import './Header.css'
import BrandMark from './BrandMark'

export default function Header() {
  const location = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  const [footerVisible, setFooterVisible] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const program = useRef<HTMLDetailsElement>(null)
  const open = openAt === location.key
  useEffect(() => { if (program.current) program.current.open = false }, [location.key])
  useEffect(() => {
    const footer = document.querySelector('.site-footer')
    if (!footer) return
    const observer = new IntersectionObserver(([entry]) => {
      setFooterVisible(entry.isIntersecting)
      if (entry.isIntersecting) {
        setOpenAt(null)
        if (program.current) program.current.open = false
      }
    }, { threshold: 0 })
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])
  return <header className={`site-header${footerVisible ? ' site-header--hidden' : ''}`} inert={footerVisible} aria-hidden={footerVisible || undefined} onKeyDown={e => {
    if (e.key === 'Escape') {
      if (program.current?.open) { program.current.open = false; program.current.querySelector('summary')?.focus() }
      else { setOpenAt(null); toggle.current?.focus() }
    }
  }}>
    <div className="container site-header__inner">
      <Link to="/" className="site-header__brand" aria-label="Hult Prize at the University of Windsor home"><BrandMark /></Link>
      <button className="site-header__toggle" ref={toggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpenAt(open ? null : location.key)}>{open ? 'Close' : 'Menu'}</button>
      <nav id="site-navigation" className={`site-header__nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink><NavLink to="/about">About</NavLink>
        <details ref={program} className="program-menu"><summary>The Program</summary><div><NavLink to="/year-one">Year One</NavLink><NavLink to="/this-year">This Year</NavLink><NavLink to="/events">Events</NavLink></div></details>
        <NavLink to="/compete">Compete</NavLink><NavLink to="/partners">Partners</NavLink><NavLink to="/contact">Contact</NavLink>
      </nav>
      <div className="site-header__register"><RegisterButton>Register</RegisterButton></div>
    </div>
  </header>
}
