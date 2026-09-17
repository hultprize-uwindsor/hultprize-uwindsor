import { Link } from 'react-router-dom'
import { SITE } from '../data/site'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container site-footer__inner">
        <div className="site-footer__col site-footer__brand">
          <Link to="/" aria-label="Hult Prize at the University of Windsor home">
            <img
              src="/images/logos/Hult Prize logos Horizontal White.png"
              alt="Hult Prize"
              width="260"
              height="60"
              className="site-footer__wordmark"
            />
          </Link>
          <p className="site-footer__tagline">{SITE.tagline}</p>
          <p className="site-footer__muted">
            The University of Windsor&apos;s chapter of the Hult Prize,
            the world&apos;s largest student competition for social entrepreneurship.
          </p>
        </div>

        <nav className="site-footer__col" aria-label="Footer navigation">
          <h3>Explore</h3>
          <ul className="site-footer__links">
            <li><Link to="/#what-you-win">The competition</Link></li>
            <li><Link to="/#key-dates">Key dates</Link></li>
            <li><Link to="/team">Our team</Link></li>
            <li><Link to="/#signup">Register to compete</Link></li>
          </ul>
        </nav>

        <div className="site-footer__col">
          <h3>Contact us</h3>
          <p><a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
          <p className="site-footer__muted">
            Campus Director<br />
            <a href={`mailto:${SITE.campusDirectorEmail}`}>{SITE.campusDirectorEmail}</a>
          </p>
          <p className="site-footer__muted">University of Windsor<br />Windsor, Ontario, Canada</p>
          <div className="site-footer__social">
            {SITE.instagramHandle && (
              <a href={SITE.instagramUrl} target="_blank" rel="noreferrer">
                {SITE.instagramHandle}
              </a>
            )}
            {SITE.linkedinUrl && (
              <a href={SITE.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
            )}
          </div>
        </div>

        <div className="site-footer__col">
          <h3>Your next steps</h3>
          <p className="site-footer__muted">Registration closes<br /><span className="site-footer__date">{SITE.registrationCloses}</span></p>
          <p className="site-footer__muted">Qualifier Finals<br /><span className="site-footer__date">{SITE.qualifierFinals}</span></p>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>
          &copy; {new Date().getFullYear()} Hult Prize at the University of Windsor.<br className="site-footer__mobile-break" />{' '}
          Not an official Hult Prize Foundation website.
        </p>
        <a
          className="site-footer__official"
          href="https://www.hultprize.org/"
          target="_blank"
          rel="noreferrer"
        >
          Global Hult Prize website <span aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>
  )
}
