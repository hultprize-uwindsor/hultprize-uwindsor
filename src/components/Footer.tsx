import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../data/site'
import './Footer.css'

const footerLinks = [
  { label: 'Website', href: SITE.websiteUrl, icon: 'website' },
  { label: 'Email', href: `mailto:${SITE.contactEmail}`, icon: 'email' },
  { label: 'Instagram', href: SITE.instagramUrl, icon: 'instagram' },
  { label: 'LinkedIn', href: SITE.linkedinUrl, icon: 'linkedin' },
  { label: 'Signal · Registered teams', href: SITE.signalRegisteredUrl, icon: 'signal' },
  { label: 'Signal · Looking for a team', href: SITE.signalLookingUrl, icon: 'signal' },
  { label: 'Official registration', href: SITE.registrationUrl, icon: 'registration' },
] as const

function FooterIcon({ icon }: { icon: typeof footerLinks[number]['icon'] }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {icon === 'website' && <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6h14M5 18h14" /></>}
      {icon === 'email' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
      {icon === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>}
      {icon === 'linkedin' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M11 17v-7m0 3a3 3 0 0 1 6 0v4" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /></>}
      {icon === 'signal' && <><path d="M5.5 19.5 3 21l.8-4A9 9 0 1 1 8 20.1" strokeDasharray="2 3" /><path d="M12 6a6 6 0 0 0-5.2 9L6 18l3-.8A6 6 0 1 0 12 6Z" /></>}
      {icon === 'registration' && <><rect x="5" y="4" width="14" height="17" rx="2" /><rect x="9" y="2" width="6" height="4" rx="1" /><path d="m8 13 3 3 5-6" /></>}
    </svg>
  )
}

export default function Footer() {
  const wordmarkText = useRef<SVGTextElement>(null)
  const [wordmarkBounds, setWordmarkBounds] = useState('15.77 0 1023.52 150')
  useEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled || !wordmarkText.current) return
      const style = getComputedStyle(wordmarkText.current)
      const context = document.createElement('canvas').getContext('2d')
      if (!context) return
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText('HULT PRIZE')
      const advanceCorrection = wordmarkText.current.getComputedTextLength() - metrics.width
      const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + advanceCorrection
      if (inkWidth > 0) setWordmarkBounds(`${-metrics.actualBoundingBoxLeft} 0 ${inkWidth} 150`)
    })
    return () => { cancelled = true }
  }, [])
  return (
    <footer className="site-footer" id="contact">
      <div className="container site-footer__inner">
        <nav className="site-footer__col site-footer__explore" aria-label="Footer navigation">
          <h3>Explore</h3>
          <ul className="site-footer__links">
            <li><Link to="/about">About</Link></li>
            <li><Link to="/year-one">Year one</Link></li>
            <li><Link to="/this-year">This year</Link></li>
            <li><Link to="/events">Events</Link></li>
            <li><Link to="/compete">Compete</Link></li>
            <li><Link to="/partners">Partners</Link></li>
            <li><Link to="/contact">Find us</Link></li>
          </ul>
        </nav>

        <div className="site-footer__col site-footer__contact">
          <h3>Contact us</h3>
          <p><a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
          <p className="site-footer__muted">
            Campus Director<br />
            <a href={`mailto:${SITE.campusDirectorEmail}`}>{SITE.campusDirectorEmail}</a>
          </p>
          <p className="site-footer__muted">University of Windsor<br />Windsor, Ontario, Canada</p>
        </div>

        <div className="site-footer__col site-footer__community">
          <h3>Socials</h3>
          <nav className="site-footer__social" aria-label="Social and community links">
            {footerLinks.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target={icon === 'email' ? undefined : '_blank'}
                rel={icon === 'email' ? undefined : 'noopener noreferrer'}
                title={label}
              >
                <span className="site-footer__social-icon"><FooterIcon icon={icon} /></span>
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="site-footer__col site-footer__next">
          <h3>Your next steps</h3>
          <p className="site-footer__muted">Registration closes<br /><span className="site-footer__date">{SITE.registrationCloses}</span></p>
          <p className="site-footer__muted">Grand Finale<br /><span className="site-footer__date">{SITE.qualifierFinals}</span></p>
        </div>
      </div>

      <svg className="site-footer__display-wordmark" viewBox={wordmarkBounds} role="img" aria-label="HULT PRIZE">
        {/* Fit the visible glyph bounds, excluding the font’s outer side bearings. */}
        <text ref={wordmarkText} x="0" y="140">HULT PRIZE</text>
      </svg>
      <div className="container site-footer__bottom">
        <p>
          &copy; {new Date().getFullYear()} Hult Prize at the University of Windsor.
        </p>

      </div>
    </footer>
  )
}
