import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { RegisterButton } from './PageParts'
import { SITE } from '../data/site'
import './Header.css'
import BrandMark from './BrandMark'

function GlobalLink({ className }: { className: string }) {
  return <a className={`site-header__global ${className}`} href={SITE.globalUrl} target="_blank" rel="noopener noreferrer">Part of the global EF Hult Prize<span aria-hidden="true"> ↗</span></a>
}

export default function Header() {
  const location = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  // As on hultprize.org: hide on scroll down, come back with a shadow on any scroll up.
  const [hidden, setHidden] = useState(false)
  const [raised, setRaised] = useState(false)
  const header = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const program = useRef<HTMLDetailsElement>(null)
  const open = openAt === location.key
  // Route changes scroll to the top, and any upward scroll brings the header back.
  useEffect(() => { if (program.current) program.current.open = false }, [location.key])
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setRaised(y > 64)
      // Never hide while a keyboard user is inside the header; a mouse click leaves focus behind, so that alone does not count.
      const focused = document.activeElement
      const keyboardInside = focused instanceof HTMLElement && !!header.current?.contains(focused) && focused.matches(':focus-visible')
      if (y > last && y > 64 && !keyboardInside) setHidden(true)
      else if (y < last) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const isHidden = hidden && !open
  // The menu stays put while open; a dropdown left open would float over the page once hidden.
  useEffect(() => { if (isHidden && program.current) program.current.open = false }, [isHidden])
  return <header ref={header} className={`site-header${isHidden ? ' site-header--hidden' : ''}${raised && !isHidden ? ' site-header--raised' : ''}`} onFocusCapture={() => setHidden(false)} onBlur={e => {
    // Tabbing out of the open phone menu closes it, so it never covers the newly focused content.
    // A tap on empty menu space has no relatedTarget, so it leaves the menu open.
    if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) { setOpenAt(null); if (program.current) program.current.open = false }
  }} onKeyDown={e => {
    if (e.key === 'Escape') {
      if (program.current?.open) { program.current.open = false; program.current.querySelector('summary')?.focus({ preventScroll: true }) }
      else { setOpenAt(null); toggle.current?.focus({ preventScroll: true }) }
    }
  }}>
    <div className="container site-header__inner">
      <Link to="/" className="site-header__brand" aria-label="University of Windsor and EF Hult Prize, home"><BrandMark /></Link>
      <button className="site-header__toggle" ref={toggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpenAt(open ? null : location.key)}>{open ? 'Close' : 'Menu'}</button>
      <nav id="site-navigation" className={`site-header__nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink><NavLink to="/about">About</NavLink>
        <details ref={program} className="program-menu"><summary>The program</summary><div><NavLink to="/year-one">Year one</NavLink><NavLink to="/this-year">This year</NavLink><NavLink to="/events">Events</NavLink></div></details>
        <NavLink to="/compete">Compete</NavLink><NavLink to="/partners">Partners</NavLink><NavLink to="/contact">Contact</NavLink>
        <GlobalLink className="site-header__global--menu" />
        {/* On phones Register moves into the menu, as on hultprize.org, so the lockup stays legible. */}
        <div className="site-header__menu-register"><RegisterButton>Register</RegisterButton></div>
      </nav>
      <div className="site-header__register"><GlobalLink className="site-header__global--bar" /><RegisterButton>Register</RegisterButton></div>
    </div>
  </header>
}
