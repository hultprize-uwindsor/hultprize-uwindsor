import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { RegisterButton } from './PageParts'
import { SITE } from '../data/site'
import { COMMUNITY_PARTNERS } from '../data/communityPartners'
import './Header.css'
import BrandMark from './BrandMark'

// A dropdown in the main nav. The shared name makes the menus exclusive: opening one closes the other.
// The summary is underlined while you are on any page inside the menu.
function NavMenu({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  return <details className="program-menu" name="site-menu"><summary className={active ? 'active' : undefined}>{label}</summary><div>{children}</div></details>
}

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
  const open = openAt === location.key
  const closeMenus = () => header.current?.querySelectorAll('details[open]').forEach(menu => { (menu as HTMLDetailsElement).open = false })
  // Route changes scroll to the top, and any upward scroll brings the header back.
  useEffect(() => { closeMenus() }, [location.key])
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
  useEffect(() => { if (isHidden) closeMenus() }, [isHidden])
  return <header ref={header} className={`site-header${isHidden ? ' site-header--hidden' : ''}${raised && !isHidden ? ' site-header--raised' : ''}`} onFocusCapture={() => setHidden(false)} onBlur={e => {
    // Tabbing out of the open phone menu closes it, so it never covers the newly focused content.
    // A tap on empty menu space has no relatedTarget, so it leaves the menu open.
    if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) { setOpenAt(null); closeMenus() }
  }} onKeyDown={e => {
    if (e.key === 'Escape') {
      const menu = header.current?.querySelector<HTMLDetailsElement>('details[open]')
      if (menu) { menu.open = false; menu.querySelector('summary')?.focus({ preventScroll: true }) }
      else { setOpenAt(null); toggle.current?.focus({ preventScroll: true }) }
    }
  }}>
    <div className="container site-header__inner">
      <Link to="/" className="site-header__brand" aria-label="University of Windsor and EF Hult Prize, home"><BrandMark /></Link>
      <button className="site-header__toggle" ref={toggle} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpenAt(open ? null : location.key)}>{open ? 'Close' : 'Menu'}</button>
      <nav id="site-navigation" className={`site-header__nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink><NavLink to="/about">About</NavLink>
        <NavMenu label="The program" active={/^\/(year-one|this-year|events)(\/|$)/.test(location.pathname)}><NavLink to="/year-one">Year one</NavLink><NavLink to="/this-year">This year</NavLink><NavLink to="/events">Events</NavLink></NavMenu>
        <NavLink to="/compete">Compete</NavLink>
        <NavMenu label="Partners" active={/^\/partners(\/|$)/.test(location.pathname)}><NavLink to="/partners" end>Overview</NavLink>{COMMUNITY_PARTNERS.map(partner => <NavLink key={partner.slug} to={`/partners/${partner.slug}`}>{partner.name}</NavLink>)}</NavMenu>
        <NavLink to="/contact">Contact</NavLink>
        <GlobalLink className="site-header__global--menu" />
        {/* On phones Register moves into the menu, as on hultprize.org, so the lockup stays legible. */}
        <div className="site-header__menu-register"><RegisterButton>Register</RegisterButton></div>
      </nav>
      <div className="site-header__register"><GlobalLink className="site-header__global--bar" /><RegisterButton>Register</RegisterButton></div>
    </div>
  </header>
}
