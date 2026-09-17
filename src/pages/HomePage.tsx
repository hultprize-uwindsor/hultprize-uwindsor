import { Link } from 'react-router-dom'
import SignupForm from '../components/SignupForm'
import PhotoCarousel from '../components/PhotoCarousel'
import SponsorCarousel from '../components/SponsorCarousel'
import Reveal from '../components/Reveal'
import { EVENT_PHOTOS } from '../data/eventPhotos'
import { SITE } from '../data/site'
import { SPONSOR_LOGOS } from '../data/sponsors'
import './HomePage.css'

const GLOBAL_REACH = [
  { value: '130+', label: 'Countries connected' },
  { value: '50K+', label: 'Entrepreneurs worldwide' },
  { value: '200K+', label: 'Participants each year' },
  { value: '$1M', label: 'USD in global seed funding' },
]

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="home-heading">
        <div className="hero__media">
          <img
            src="/images/hult-placeholders/global-final.webp"
            alt="The EF Hult Prize trophy under purple stage lighting"
            width="1400"
            height="788"
            fetchPriority="high"
          />
        </div>
        <div className="container hero__inner">
          <Reveal className="hero__content">
            <h1 id="home-heading">
              {SITE.tagline.split(/(?<=,)\s+/).map((line) => (
                <span key={line}>{line}{' '}</span>
              ))}
            </h1>
            <p className="hero__lede">
              Your idea could change the world.
              Start your Hult Prize journey at the University of Windsor.
            </p>
            <div className="hero__actions">
              <a href="#signup" className="btn btn--light">Register to compete</a>
              <a href="#what-you-win" className="hero__learn">Discover the opportunity <span aria-hidden="true">↓</span></a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section home-opportunity" id="what-you-win" aria-labelledby="opportunity-heading">
        <div className="container">
          <Reveal className="home-centered-intro">
            <h2 id="opportunity-heading">A campus beginning.<br />A global opportunity.</h2>
            <p>
              Join a worldwide community of student founders turning bold ideas
              into businesses with impact. Build your team, develop your idea,
              and compete for $1 million USD in seed funding at the Global Final.
            </p>
            <a href="#key-dates" className="btn btn--light">Your competition journey <span aria-hidden="true">→</span></a>
          </Reveal>
          <div className="impact-grid">
            {GLOBAL_REACH.map((stat, index) => (
              <Reveal className="impact-card" delay={index * 60} key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="home-community" aria-labelledby="community-heading">
        <PhotoCarousel slides={EVENT_PHOTOS} variant="panorama" />
        <div className="container section home-community__content">
          <Reveal className="home-centered-intro">
            <h2 id="community-heading">Big ideas need<br />people like you.</h2>
            <p>
              Compete, collaborate, mentor, or support the next generation of
              founders. A global movement starts with the people right here
              on campus.
            </p>
            <Link to="/team" className="btn btn--dark">Meet our team <span aria-hidden="true">→</span></Link>
          </Reveal>
          <a className="home-photo-credit" href="https://www.hultprize.org/" target="_blank" rel="noreferrer">Photography: Hult Prize</a>
        </div>
      </section>

      <SponsorCarousel logos={SPONSOR_LOGOS} heading="Global Hult Prize partners" />

      <section className="section home-dates" id="key-dates" aria-labelledby="dates-heading">
        <div className="container">
          <Reveal className="home-centered-intro">
            <h2 id="dates-heading">Your idea.<br />Your next big step.</h2>
            <p>Bring your ambition. We’ll help you find the people, practice, and momentum to move it forward.</p>
          </Reveal>
          <div className="dates-grid">
            <Reveal className="date-card">
              <span className="date-card__label">Registration closes</span>
              <h3 className="date-card__value">{SITE.registrationCloses}</h3>
              <p>Take the first step. Sign up to hear about team formation, workshops, and the campus competition.</p>
              <a href="#signup" className="btn btn--dark">Save your place <span aria-hidden="true">→</span></a>
            </Reveal>
            <Reveal className="date-card" delay={80}>
              <span className="date-card__label">Qualifier Finals</span>
              <h3 className="date-card__value">{SITE.qualifierFinals}</h3>
              <p>Pitch your business on campus. The winning team represents UWindsor in the next stage of Hult Prize.</p>
              <a href="#signup" className="btn btn--secondary">Get involved <span aria-hidden="true">→</span></a>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section home-signup" id="signup" aria-labelledby="signup-heading">
        <div className="container home-signup__inner">
          <Reveal className="home-signup__intro">
            <img
              className="home-signup__brand"
              src="/images/logos/Hult%20Prize%20logo%201.png"
              alt="EF Hult Prize"
              width="1392"
              height="950"
              loading="lazy"
            />
            <h2 id="signup-heading">One idea can<br />start something big.</h2>
            <p className="signup-intro">
              Tell us a little about yourself. Our campus team will be in touch
              with everything you need to get started.
            </p>
            <p className="home-signup__contact">
              Have a question? <a href={'mailto:' + SITE.contactEmail}>Talk to our team <span aria-hidden="true">→</span></a>
            </p>
          </Reveal>
          <SignupForm />
        </div>
      </section>
    </>
  )
}
