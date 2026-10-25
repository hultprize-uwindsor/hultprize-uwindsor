import { Link } from '../components/PageLink'
import HeroCollage from '../components/HeroCollage'
import { HeroTitle, RevealText, RollingLabel } from '../components/MotionText'
import { FloatingIntroduction, JourneyExperience } from '../components/HomeExperience'
import { ProgrammeFeature } from '../components/ProgrammeFeature'
import { GlobalPrize } from '../components/GlobalPrize'
import { Stats } from '../components/PageParts'
import WallCalendar from '../components/WallCalendar'
import UpNextTicket from '../components/UpNextTicket'
import { SITE } from '../data/site'
import { useAttendanceEvents } from '../lib/attendance'

export default function HomePage() {
  const { events } = useAttendanceEvents()
  const upcoming=events.find(event => new Date(event.endsAt).getTime() > Date.now() && !['cancelled', 'completed'].includes(event.status))
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title"><div className="container"><HeroCollage><div className="board-card home-hero__copy"><p className="eyebrow">Hult Prize at the University of Windsor</p><HeroTitle id="home-title">One idea.<br />Four minutes.<br />$1,000,000.</HeroTitle></div><div className="board-note home-hero__aside"><p>Build a business that changes something.</p><p className="home-hero__detail">Start at Windsor. Compete for US$1 million in seed funding at the global final.</p><a className="btn btn--primary" href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer"><RollingLabel>Register your team</RollingLabel><span aria-hidden="true">↗</span></a></div></HeroCollage></div><a className="home-scroll" href="#discover" aria-label="Scroll to explore">↓ <span>Scroll to explore</span></a></section>
    <div id="discover"><FloatingIntroduction /></div>
    <JourneyExperience />
    <ProgrammeFeature />
    <section className="section home-results"><div className="container"><div className="home-results__heading"><span className="tag">Where we started</span><h2 data-text-reveal><RevealText>Windsor showed up.</RevealText></h2><p>Fourteen startups. Two teams at Nationals.<br />Named Best Program in North America.</p><Link className="text-link" to="/year-one">Our first season <span aria-hidden="true">↗</span></Link></div><Stats /></div></section>
    <GlobalPrize />
    <section className="section home-calendar" id="key-dates"><div className="container"><div className="home-calendar__intro"><span className="tag">2026-2027</span><h2 data-text-reveal><RevealText>Mark Your<br />Calendars</RevealText></h2><p>From the first workshop to Calgary.</p></div><WallCalendar /></div></section>
    {upcoming && <UpNextTicket event={upcoming} />}
  </div>
}
