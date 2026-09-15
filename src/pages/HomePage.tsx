import SignupForm from '../components/SignupForm'
import { SITE } from '../data/site'
import './HomePage.css'

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow">Hult Prize &times; University of Windsor</p>
          <h1>
            Build a startup that <span className="hero__highlight">changes the world.</span>
          </h1>
          <p className="hero__lede">
            The Hult Prize is the world's largest student competition for
            social entrepreneurship, challenging teams to build for-profit
            startups that tackle a pressing global problem. Backed by the
            United Nations and Hult International Business School, it awards
            $1,000,000 USD in seed funding to the winning team each year.
          </p>
          <div className="hero__actions">
            <a href="#signup" className="btn btn--primary">
              Sign up now
            </a>
            <a href="/team" className="btn btn--dark">
              Meet the team
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="what-you-win">
        <div className="container">
          <p className="eyebrow">What you win</p>
          <h2>More than a competition</h2>
          <div className="win-grid">
            <div className="win-card win-card--accent">
              <h3>$1,000,000 USD</h3>
              <p>
                Seed funding awarded to the winning team at the Global Final
                to launch their startup.
              </p>
            </div>
            <div className="win-card">
              <h3>Global stage</h3>
              <p>
                Top campus teams advance through regional summits toward the
                Global Final, pitching to founders, investors, and world
                leaders.
              </p>
            </div>
            <div className="win-card">
              <h3>Mentorship &amp; training</h3>
              <p>
                Workshops, coaching, and an accelerator experience that turns
                a rough idea into an investable pitch.
              </p>
            </div>
            <div className="win-card">
              <h3>A real network</h3>
              <p>
                Join a global alumni community of 50,000+ young
                entrepreneurs across 130+ countries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--dark" id="key-dates">
        <div className="container">
          <p className="eyebrow">Key dates</p>
          <h2>Mark your calendar</h2>
          <div className="dates-grid">
            <div className="date-card">
              <span className="date-card__label">Registration closes</span>
              <span className="date-card__value">{SITE.registrationCloses}</span>
              <p>Sign up below before this date to lock in your spot on a team.</p>
            </div>
            <div className="date-card">
              <span className="date-card__label">Campus Finals</span>
              <span className="date-card__value">{SITE.campusFinals}</span>
              <p>
                Teams pitch their ideas on campus — the winner represents
                UWindsor at the next round.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--alt" id="signup">
        <div className="container">
          <p className="eyebrow">Join us</p>
          <h2>Sign up</h2>
          <p className="signup-intro">
            Tell us a bit about yourself and we'll follow up with everything
            you need to get started.
          </p>
          <SignupForm />
        </div>
      </section>
    </>
  )
}
