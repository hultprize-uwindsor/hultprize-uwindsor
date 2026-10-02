import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { RegisterButton } from './PageParts'
import { RollingLabel } from './MotionText'
import { SITE } from '../data/site'
import { COMMUNITY_PARTNERS } from '../data/communityPartners'
import './Header.css'

const MOBILE_QUERY = '(max-width: 1180px)'
const programLinks = [
  { to: '/about', label: 'About', description: 'The competition and our team', image: '/images/hult-placeholders/community.webp' },
  { to: '/year-one', label: 'Year one', description: 'Where we started', image: '/images/hult-placeholders/competition.webp' },
  { to: '/this-year', label: 'This year', description: 'The road to Nationals', image: '/images/hult-placeholders/global-final.webp' },
  { to: '/events', label: 'Events', description: 'What’s happening next', image: '/images/events/hult-fusion-launch-flyer.jpg' },
]

function HomeIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7" /></svg>
}

function Thumbnail({ image, motif = 'orbit', logo = false }: { image?: string; motif?: string; logo?: boolean }) {
  return <span className={`nav-thumbnail${logo ? ' nav-thumbnail--logo' : ''}${image ? '' : ` nav-thumbnail--${motif}`}`} aria-hidden="true">{image ? <img src={image} alt="" width="64" height="64" loading="lazy" /> : <i />}</span>
}

function NavMenu({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const openedByHover = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelClose = () => clearTimeout(closeTimer.current)
  useEffect(() => {
    const reveal = menu.current?.querySelector<HTMLElement>('.program-menu__reveal')
    if (reveal) reveal.inert = true
    return () => clearTimeout(closeTimer.current)
  }, [])
  return <details ref={menu} className="program-menu" name="site-menu" onToggle={event => {
    const reveal = event.currentTarget.querySelector<HTMLElement>('.program-menu__reveal')
    if (reveal) reveal.inert = !event.currentTarget.open
  }} onPointerEnter={e => {
    if (e.pointerType !== 'mouse') return
    cancelClose()
    if (menu.current && !menu.current.open) {
      openedByHover.current = true
      menu.current.open = true
    }
  }} onPointerLeave={e => {
    if (e.pointerType !== 'mouse') return
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (menu.current && !menu.current.contains(document.activeElement)) menu.current.open = false
    }, 160)
  }} onBlur={e => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.open = false
  }} onKeyDown={e => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.currentTarget.open = false
      e.currentTarget.querySelector('summary')?.focus()
    }
    if (['ArrowUp', 'ArrowDown'].includes(e.key) && e.target instanceof HTMLElement && e.target.tagName === 'SUMMARY') {
      e.preventDefault()
      e.currentTarget.open = true
      const reveal = e.currentTarget.querySelector<HTMLElement>('.program-menu__reveal')
      if (reveal) reveal.inert = false
      e.currentTarget.querySelector('a')?.focus()
    }
  }}><summary className={active ? 'active' : undefined} onClick={e => {
    if (e.detail > 0 && openedByHover.current && menu.current?.open) e.preventDefault()
    openedByHover.current = false
  }}><span className="nav-hover-fill" aria-hidden="true" /><span>{label}</span><svg className="nav-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg></summary><div className="program-menu__reveal"><div className="program-menu__panel">{children}</div></div></details>
}

export default function Header() {
  const location = useLocation()
  const [openAt, setOpenAt] = useState<string | null>(null)
  const header = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const menuOverflow = useRef<string | null>(null)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const exitStart = useRef<{ background: string; mask: string; content: string; opacity: string } | null>(null)
  const open = openAt === location.key
  const closeMenus = () => header.current?.querySelectorAll('details[open]').forEach(menu => { (menu as HTMLDetailsElement).open = false })
  const closeMobile = () => setOpenAt(null)

  useEffect(() => { closeMenus() }, [location.key])
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const onResize = () => { if (!media.matches) setOpenAt(null) }
    const onOutsidePointer = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) closeMenus()
    }
    media.addEventListener('change', onResize)
    document.addEventListener('pointerdown', onOutsidePointer)
    return () => {
      media.removeEventListener('change', onResize)
      document.removeEventListener('pointerdown', onOutsidePointer)
    }
  }, [])

  // Keep the native modal open until its exit wipe finishes, so focus and
  // page scrolling stay contained for the full transition.
  useEffect(() => {
    const menu = dialog.current
    if (!menu) return
    const background = menu.querySelector<HTMLElement>('.mobile-navigation__background')!
    const mask = menu.querySelector<HTMLElement>('.mobile-navigation__mask')!
    const content = menu.querySelector<HTMLElement>('.mobile-navigation__content')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    const animations: Animation[] = []
    const finishClose = () => {
      if (cancelled) return
      menu.close()
      if (menuOverflow.current !== null) document.body.style.overflow = menuOverflow.current
      menuOverflow.current = null
      exitStart.current = null
      menuTrigger.current?.focus({ preventScroll: true })
    }
    if (open) {
      if (!menu.open) {
        menuOverflow.current = document.body.style.overflow
        menu.showModal()
      }
      document.body.style.overflow = 'hidden'
      menu.querySelector<HTMLButtonElement>('.is-close')?.focus({ preventScroll: true })
      menu.dataset.motion = 'enter'
      if (!reduced) {
        const easing = 'cubic-bezier(.16, 1, .3, 1)'
        animations.push(background.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 800, easing }))
        animations.push(mask.animate([{ transform: 'translateY(120%)' }, { transform: 'translateY(0)' }], { duration: 800, easing }))
        animations.push(content.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], { duration: 800, easing }))
        animations.push(content.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-in' }))
      }
    } else if (menu.open) {
      menu.dataset.motion = 'exit'
      if (reduced) finishClose()
      else {
        const timing: KeyframeAnimationOptions = { duration: 400, easing: 'cubic-bezier(.55, .085, .68, .53)', fill: 'forwards' }
        animations.push(background.animate([{ transform: exitStart.current?.background ?? getComputedStyle(background).transform }, { transform: 'translateY(-101%)' }], timing))
        animations.push(mask.animate([{ transform: exitStart.current?.mask ?? getComputedStyle(mask).transform }, { transform: 'translateY(-103%)' }], timing))
        animations.push(content.animate([{ transform: exitStart.current?.content ?? getComputedStyle(content).transform, opacity: exitStart.current?.opacity ?? '1' }, { transform: 'translateY(100%)', opacity: 0 }], timing))
        void animations[0].finished.then(finishClose).catch(() => {})
      }
    }
    return () => {
      cancelled = true
      if (open && menu.open) exitStart.current = { background: getComputedStyle(background).transform, mask: getComputedStyle(mask).transform, content: getComputedStyle(content).transform, opacity: getComputedStyle(content).opacity }
      animations.forEach(animation => animation.cancel())
    }
  }, [open])
  useEffect(() => () => {
    dialog.current?.close()
    if (menuOverflow.current !== null) document.body.style.overflow = menuOverflow.current
    menuOverflow.current = null
  }, [])

  const onNavigate = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) {
      closeMenus()
      closeMobile()
    }
  }

  return <>
    <header ref={header} className="site-header" onClick={onNavigate}>
      <div className="site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="University of Windsor and EF Hult Prize, home"><img className="brand-mark" src="/images/logos/hult-uwindsor-navbar-white.png" alt="University of Windsor and EF Hult Prize" width="1348" height="240" /></Link>
        <div className="site-header__actions"><Link className="site-header__updates" to="/compete#signup"><RollingLabel>Get updates</RollingLabel></Link><RegisterButton>Register</RegisterButton></div>
      </div>
      <nav id="site-navigation" className="site-header__nav" aria-label="Main navigation">
        <NavLink to="/" end className="site-header__home" aria-label="Home"><span className="nav-hover-fill" aria-hidden="true" /><HomeIcon /></NavLink>
        <NavMenu label="Programme" active={/^\/(about|year-one|this-year|events)(\/|$)/.test(location.pathname)}>{programLinks.map(link => <NavLink key={link.to} to={link.to}><Thumbnail image={link.image} /><span className="nav-item-copy"><span>{link.label}</span><small>{link.description}</small></span><span className="nav-item-arrow" aria-hidden="true">↗</span></NavLink>)}</NavMenu>
        <NavLink to="/compete"><span className="nav-hover-fill" aria-hidden="true" /><span>Compete</span></NavLink>
        <NavMenu label="Partners" active={/^\/partners(\/|$)/.test(location.pathname)}><NavLink to="/partners" end><Thumbnail motif="steps" /><span className="nav-item-copy"><span>Our partners</span><small>Backing student founders</small></span><span className="nav-item-arrow" aria-hidden="true">↗</span></NavLink>{COMMUNITY_PARTNERS.map(partner => <NavLink key={partner.slug} to={`/partners/${partner.slug}`}><Thumbnail image={partner.logo} logo /><span className="nav-item-copy"><span>{partner.name}</span></span><span className="nav-item-arrow" aria-hidden="true">↗</span></NavLink>)}</NavMenu>
        <NavLink to="/contact"><span className="nav-hover-fill" aria-hidden="true" /><span>Contact</span></NavLink>
      </nav>
      <button ref={menuTrigger} type="button" className="site-header__toggle" aria-label="Menu" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpenAt(location.key)}>Menu<span className="menu-symbol" aria-hidden="true"><i /><i /></span></button>
    </header>
    <dialog ref={dialog} id="mobile-navigation" className="mobile-navigation" data-lenis-prevent aria-label="Main menu" onCancel={event => { event.preventDefault(); closeMobile() }} onClose={closeMobile} onClick={onNavigate} onKeyDown={e => {
      if (e.key !== 'Tab') return
      const links = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'))
      const first = links[0]
      const last = links[links.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }}>
      <div className="mobile-navigation__background" aria-hidden="true" />
      <div className="mobile-navigation__mask"><div className="mobile-navigation__content">
      <div className="mobile-navigation__bar">
        <Link to="/" className="site-header__brand" aria-label="University of Windsor and EF Hult Prize, home"><img className="brand-mark" src="/images/logos/hult-uwindsor-navbar-white.png" alt="University of Windsor and EF Hult Prize" width="1348" height="240" /></Link><RegisterButton>Register</RegisterButton>
      </div>
      <nav className="mobile-navigation__links" aria-label="Main navigation">
        <div className="mobile-navigation__group"><NavLink to="/" end><Thumbnail /><span>Home</span></NavLink></div>
        <div className="mobile-navigation__group"><h2>Programme</h2>{programLinks.map(link => <NavLink key={link.to} to={link.to}><Thumbnail image={link.image} /><span>{link.label}</span></NavLink>)}</div>
        <div className="mobile-navigation__group"><NavLink to="/compete"><Thumbnail motif="steps" /><span>Compete</span></NavLink><NavLink to="/contact"><Thumbnail motif="chat" /><span>Contact</span></NavLink></div>
        <div className="mobile-navigation__group"><h2>Partners</h2><NavLink to="/partners" end><Thumbnail motif="steps" /><span>Our partners</span></NavLink>{COMMUNITY_PARTNERS.map(partner => <NavLink key={partner.slug} to={`/partners/${partner.slug}`}><Thumbnail image={partner.logo} logo /><span>{partner.name}</span></NavLink>)}</div>
        <div className="mobile-navigation__actions"><Link to="/compete#signup">Get programme updates <span aria-hidden="true">↗</span></Link><a href={SITE.globalUrl} target="_blank" rel="noopener noreferrer">The global EF Hult Prize <span aria-hidden="true">↗</span></a></div>
      </nav>
      </div></div>
      <button type="button" className="site-header__toggle is-close" aria-label="Close menu" onClick={closeMobile} autoFocus>Menu<span className="menu-symbol" aria-hidden="true"><i /><i /></span></button>
    </dialog>
  </>
}
