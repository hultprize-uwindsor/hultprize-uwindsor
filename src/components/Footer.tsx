import { SITE } from '../data/site'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container site-footer__inner">
        <div className="site-footer__col">
          <img
            src="/images/wordmark-white.svg"
            alt="Hult Prize at University of Windsor"
            className="site-footer__wordmark"
          />
          <p className="site-footer__tagline">
            The University of Windsor's chapter of the Hult Prize — the
            world's largest student competition for social entrepreneurship.
          </p>
        </div>

        <div className="site-footer__col">
          <h3>Contact</h3>
          <p>
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </p>
          {SITE.instagramHandle && (
            <p>
              <a href={SITE.instagramUrl} target="_blank" rel="noreferrer">
                {SITE.instagramHandle}
              </a>
            </p>
          )}
          <p className="site-footer__muted">University of Windsor, Windsor, ON</p>
        </div>

        <div className="site-footer__col">
          <h3>Key dates</h3>
          <p>Registration closes: {SITE.registrationCloses}</p>
          <p>Campus Finals: {SITE.campusFinals}</p>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>
          &copy; {new Date().getFullYear()} Hult Prize at University of
          Windsor. Not an official Hult Prize Foundation website.
        </p>
        <a
          className="site-footer__official"
          href="https://www.hultprize.org/"
          target="_blank"
          rel="noreferrer"
        >
          hultprize.org &rarr;
        </a>
      </div>
    </footer>
  )
}
