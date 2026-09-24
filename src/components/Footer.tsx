import { Link } from 'react-router-dom'
import { SITE } from '../data/site'
import './Footer.css'

const socials = [
  { label: 'Instagram', href: SITE.instagramUrl, icon: 'instagram' },
  { label: 'LinkedIn', href: SITE.linkedinUrl, icon: 'linkedin' },
  { label: 'Email', href: `mailto:${SITE.contactEmail}`, icon: 'email' },
] as const

function FooterIcon({ icon }: { icon: typeof socials[number]['icon'] }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {icon === 'email' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
      {icon === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>}
      {icon === 'linkedin' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M11 17v-7m0 3a3 3 0 0 1 6 0v4" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /></>}
    </svg>
  )
}

// Lets an address wrap before the @ rather than mid-domain.
function Email({ address }: { address: string }) {
  const [user, domain] = address.split('@')
  return <a href={`mailto:${address}`}>{user}<wbr />@{domain}</a>
}

// Columns follow the hultprize.org footer: parent marks, quick links, resources, headquarters.
export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container site-footer__inner">
        <div className="site-footer__col site-footer__parent">
          <h3>EF Hult Prize</h3>
          <a className="site-footer__marks" href={SITE.globalUrl} target="_blank" rel="noopener noreferrer" aria-label="EF Hult Prize (opens hultprize.org in a new tab)">
            <img src="/images/logos/Hult Prize logos Horizontal White.png" alt="" width="1766" height="406" />
          </a>
          <p>Hult Prize at the University of Windsor is one of more than 2,200 campus programs worldwide.</p>
        </div>

        <nav className="site-footer__col" aria-label="Footer navigation">
          <h3>Quick links</h3>
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

        <div className="site-footer__col">
          <h3>Resources</h3>
          <ul className="site-footer__links">
            <li><Link to="/compete#signup">Get on the list</Link></li>
            <li><a href={SITE.signalRegisteredUrl} target="_blank" rel="noopener noreferrer">Signal · Registered teams</a></li>
            <li><a href={SITE.signalLookingUrl} target="_blank" rel="noopener noreferrer">Signal · Looking for a team</a></li>
          </ul>
          <h4>Key dates</h4>
          <p>Registration closes<br /><span className="site-footer__date">{SITE.registrationCloses}</span></p>
          <p>Grand Finale<br /><span className="site-footer__date">{SITE.qualifierFinals}</span></p>
        </div>

        <div className="site-footer__col">
          <h3>Headquarters</h3>
          <address>Fusion, Joyce Entrepreneurship Centre, 2nd Floor<br />2455 Wyandotte St.&nbsp;W.<br />Windsor, ON N9B&nbsp;0C1</address>
          <p><Email address={SITE.contactEmail} /><br />Campus Director: <Email address={SITE.campusDirectorEmail} /></p>
          <h4>Follow us</h4>
          <nav className="site-footer__social" aria-label="Social links">
            {socials.map(({ label, href, icon }) => (
              <a key={label} href={href} target={icon === 'email' ? undefined : '_blank'} rel={icon === 'email' ? undefined : 'noopener noreferrer'} aria-label={label}>
                <FooterIcon icon={icon} />
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>&copy; {new Date().getFullYear()} Hult Prize at the University of Windsor.</p>
      </div>
    </footer>
  )
}
