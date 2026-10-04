import { RevealText } from './MotionText'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from './PageLink'
import { SITE } from '../data/site'
import { COMMUNITY_PARTNERS } from '../data/communityPartners'
import { RegisterButton } from './PageParts'
import './Footer.css'

const socials = [
  { label: 'Instagram', href: SITE.instagramUrl, icon: 'instagram' },
  { label: 'LinkedIn', href: SITE.linkedinUrl, icon: 'linkedin' },
  { label: 'Email', href: `mailto:${SITE.contactEmail}`, icon: 'email' },
] as const

function FooterIcon({ icon }: { icon: typeof socials[number]['icon'] }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {icon === 'email' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
    {icon === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>}
    {icon === 'linkedin' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M11 17v-7m0 3a3 3 0 0 1 6 0v4" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /></>}
  </svg>
}

function Email({ address }: { address: string }) {
  const [user, domain] = address.split('@')
  return <a href={`mailto:${address}`}>{user}<wbr />@{domain}</a>
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  const group = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 701px)')
    const update = () => { if (group.current) group.current.open = wide.matches }
    update()
    wide.addEventListener('change', update)
    return () => wide.removeEventListener('change', update)
  }, [])
  return <details ref={group} className="site-footer__group" open><summary>{title}<span aria-hidden="true">+</span></summary><div className="site-footer__group-content">{children}</div></details>
}

export default function Footer() {
  return <footer className="site-footer" id="contact">
    <div className="container">
      <div className="site-footer__invitation">
        <div><span className="site-footer__eyebrow">Hult Prize at UWindsor</span><h2 data-text-reveal><RevealText>Your idea.<br />Next stop: the world.</RevealText></h2></div>
        <div className="site-footer__invitation-actions"><RegisterButton>Register your team</RegisterButton><p>Registration closes {SITE.registrationCloses}.<br />Grand Finale · {SITE.qualifierFinals}</p></div>
      </div>
      <nav className="site-footer__inner" aria-label="Footer navigation">
        <FooterGroup title="Explore"><ul className="site-footer__links"><li><Link to="/">Home</Link></li><li><Link to="/about">About</Link></li><li><Link to="/year-one">Year one</Link></li><li><Link to="/this-year">This year</Link></li><li><Link to="/events">Events</Link></li><li><Link to="/compete">Compete</Link></li></ul></FooterGroup>
        <FooterGroup title="Partners"><ul className="site-footer__links"><li><Link to="/partners">Our partners</Link></li>{COMMUNITY_PARTNERS.map(partner => <li key={partner.slug}><Link to={`/partners/${partner.slug}`}>{partner.name}</Link></li>)}<li><Link to="/partners#packages">Sponsorship packages</Link></li></ul></FooterGroup>
        <FooterGroup title="Stay connected"><ul className="site-footer__links"><li><Link to="/compete#signup">Get programme updates</Link></li><li><a href={SITE.signalRegisteredUrl} target="_blank" rel="noopener noreferrer">Signal · Registered teams <span aria-hidden="true">↗</span></a></li><li><a href={SITE.signalLookingUrl} target="_blank" rel="noopener noreferrer">Signal · Find a team <span aria-hidden="true">↗</span></a></li><li><a href={SITE.globalUrl} target="_blank" rel="noopener noreferrer">The global EF Hult Prize <span aria-hidden="true">↗</span></a></li></ul><div className="site-footer__social" aria-label="Social links">{socials.map(({ label, href, icon }) => <a key={label} href={href} target={icon === 'email' ? undefined : '_blank'} rel={icon === 'email' ? undefined : 'noopener noreferrer'} aria-label={label}><FooterIcon icon={icon} /></a>)}</div></FooterGroup>
        <FooterGroup title="Find us"><address>Fusion, Joyce Entrepreneurship Centre, 2nd Floor<br />2455 Wyandotte St. W.<br />Windsor, ON N9B 0C1</address><Link className="site-footer__directions" to="/contact">Contact & directions <span aria-hidden="true">↗</span></Link><p className="site-footer__email"><Email address={SITE.contactEmail} /></p><p className="site-footer__email"><span>Campus Director</span><Email address={SITE.campusDirectorEmail} /></p></FooterGroup>
      </nav>
      <Link to="/" className="site-footer__brand" aria-label="Hult Prize at the University of Windsor, home"><img src="/images/logos/hult-uwindsor-navbar-dark.png" alt="University of Windsor and EF Hult Prize" width="1348" height="240" loading="lazy" /></Link>
      <div className="site-footer__bottom"><p>&copy; {new Date().getFullYear()} Hult Prize at the University of Windsor.</p><p>Student ideas. Global impact.</p></div>
    </div>
  </footer>
}
