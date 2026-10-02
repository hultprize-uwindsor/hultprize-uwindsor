import { Link } from 'react-router-dom'
import BrandScene from '../components/BrandScene'
import { HeroTitle, RevealText, RollingLabel } from '../components/MotionText'
import { FloatingIntroduction, JourneyExperience } from '../components/HomeExperience'
import { ProgrammeFeature } from '../components/ProgrammeFeature'
import { GlobalPrize } from '../components/GlobalPrize'
import { Stats, Timeline } from '../components/PageParts'
import { SITE } from '../data/site'
import { upcomingPosts, formatPostDate } from '../data/posts'

export default function HomePage() {
  const upcoming=upcomingPosts()[0]
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title"><BrandScene/><div className="container home-hero__inner"><div><p className="eyebrow">Hult Prize at the University of Windsor</p><HeroTitle id="home-title">One idea.<br />4 minutes.<br />$1,000,000.</HeroTitle></div><div className="home-hero__aside"><p>Build a business that changes something.</p><p className="home-hero__detail">Start at Windsor. Compete for US$1 million in seed funding at the global final.</p><a className="btn btn--white" href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer"><RollingLabel>Register your team</RollingLabel><span aria-hidden="true">↗</span></a></div></div><a className="home-scroll" href="#discover" aria-label="Scroll to explore">↓ <span>Scroll to explore</span></a></section>
    <div id="discover"><FloatingIntroduction /></div>
    <JourneyExperience />
    <ProgrammeFeature />
    <section className="section home-results"><div className="container"><div className="home-results__heading"><span className="tag">Where we started</span><h2 data-text-reveal><RevealText>Windsor showed up.</RevealText></h2><p>Fourteen startups. Two teams at Nationals.<br />Named Best Program in North America.</p><Link className="text-link" to="/year-one">Our first season <span aria-hidden="true">↗</span></Link></div><Stats /></div></section>
    <GlobalPrize />
    <section className="section home-calendar" id="key-dates"><div className="container"><div><span className="tag">2026–2027</span><h2 data-text-reveal><RevealText>Mark Your<br />Calendars</RevealText></h2><p>From the first workshop to Calgary.</p><Link className="text-link" to="/this-year#calendar">The full calendar <span aria-hidden="true">↗</span></Link></div><Timeline compact /></div></section>
    {upcoming&&<section className="home-next-event"><div className="container"><span className="tag">Up next</span><Link to={`/events/${upcoming.slug}`}><time dateTime={upcoming.date}>{formatPostDate(upcoming.date)}</time><h2>{upcoming.title}</h2><span className="home-next-event__arrow" aria-hidden="true">↗</span></Link></div></section>}
  </div>
}
