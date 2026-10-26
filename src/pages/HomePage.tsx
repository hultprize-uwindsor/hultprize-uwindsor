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
    <section className="home-hero" aria-labelledby="home-title"><div className="container home-hero__layout">
      <div className="home-hero__intro">
        <HeroTitle id="home-title">The Hult Prize <span>Initiative</span></HeroTitle>
        <p className="home-hero__where">at the University of Windsor</p>
        <p className="home-hero__tagline">One idea. Four minutes. $1,000,000.</p>
        <a className="btn btn--primary" href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer"><RollingLabel>Register your team</RollingLabel><span aria-hidden="true">↗</span></a>
      </div>
      <HeroCollage />
    </div><a className="home-scroll" href="#discover" aria-label="Scroll to explore">↓ <span>Scroll to explore</span></a></section>
    <div id="discover"><FloatingIntroduction /></div>
    <JourneyExperience />
    <ProgrammeFeature />
    <section className="section home-results"><div className="container"><div className="home-results__heading"><h2 data-text-reveal><RevealText>Windsor showed up.</RevealText></h2><p>Fourteen startups. Two teams at Nationals.<br />Named Best Program in North America.</p><Link className="text-link" to="/year-one">Our first season <span aria-hidden="true">↗</span></Link></div><Stats /></div></section>
    <GlobalPrize />
    <section className="section home-calendar" id="key-dates"><div className="container"><div className="home-calendar__intro"><h2 data-text-reveal><RevealText>Mark Your<br />Calendars</RevealText></h2><p>The 2026-2027 season, from the first workshop to Calgary.</p></div><WallCalendar /></div></section>
    {upcoming && <UpNextTicket event={upcoming} />}
  </div>
}
