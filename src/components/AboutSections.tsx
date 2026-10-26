import { BookOpen, MapPin, Medal, Plane, Trophy, UsersRound } from 'lucide-react'
import { Link } from './PageLink'
import { RevealText } from './MotionText'
import { SITE } from '../data/site'
import { useAttendanceEvents } from '../lib/attendance'
import './AboutSections.css'
import './AboutIntro.css'

/** Why the chapter exists, written on the page, with year one's three proudest results set down beside it by hand: a
    rubber stamp, a line in marker and a taped scrap of typing. */
export function AboutIntro() {
  return <div className="about-intro">
    <div className="about-intro__copy">
      <h2 data-text-reveal><RevealText>Why we’re here</RevealText></h2>
      <div className="prose">
        <p>Hult Prize at UWindsor helps students from every program turn an idea into a business that solves a real problem. We run the University of Windsor’s campus round of the global competition, with free workshops, mentors and team matching.</p>
        <p>In our first season, 14 student startups entered, six reached the Grand Finale and two went on to Nationals. The Hult Prize Foundation named UWindsor the Best Program in North America.</p>
      </div>
    </div>
    <ul className="result-notes" aria-label="Year one results">
      <li className="result-note result-note--stamp"><span>Awarded 2026</span> <strong>Best Campus Program</strong> <span>in North America</span></li>
      <li className="result-note result-note--marker"><strong>2 teams</strong> <span>to Nationals: Mycovolt and 100% Fish</span></li>
      <li className="result-note result-note--scrap"><span className="tape" aria-hidden="true" /><strong>Top 8 in all of Canada</strong> <span>100% Fish</span></li>
    </ul>
  </div>
}

const finaleDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', month: 'long', day: 'numeric', year: 'numeric' })

/** The path from an idea to the US$1 million global prize, with the finale date read from the live schedule. */
export function CompetitionRoad() {
  const { events } = useAttendanceEvents()
  const finale = events.find(event => event.id === 'campus-grand-finale')
  const stops = [
    { icon: MapPin, where: `Register by ${SITE.registrationCloses}`, title: 'Your idea and team', text: 'Bring an idea and two to four students. Only one teammate needs to study at UWindsor.' },
    { icon: MapPin, where: `Windsor · ${finale ? finaleDate.format(new Date(finale.startsAt)) : 'February 2027'}`, title: 'Campus Grand Finale', text: 'Pitch to judges from Windsor’s business community. Up to three teams go through to Nationals.' },
    { icon: MapPin, where: 'UWill Discover · March 13, 2027', title: 'UWill Discover Conference pitch', text: 'Pitch your startup at the UWill Discover Conference.' },
    { icon: MapPin, where: 'Calgary · April 10-11, 2027', title: 'Nationals', text: 'Represent UWindsor at the Canadian National Championships.' },
    { icon: Trophy, where: 'Global final', title: 'US$1 million', text: 'The winning startup receives US$1 million in seed funding.' },
  ]
  return <ol className="competition-road">{stops.map(stop => <li key={stop.title} className="road-stop">
    <span className="road-stop__marker" aria-hidden="true"><stop.icon strokeWidth={2} /></span>
    <span className="road-stop__where">{stop.where}</span>
    <h3>{stop.title}</h3>
    <p>{stop.text}</p>
  </li>)}</ol>
}

const OFFERS = [
  { icon: BookOpen, title: 'Free workshops', text: 'Five workshops cover problem definition, business models, pitch decks and delivery. Entry and mentoring are free too.' },
  { icon: UsersRound, title: 'Mentors and teammates', text: 'Get help finding teammates and a mentor matched to your team.' },
  { icon: Medal, title: 'Campus prizes', text: '$2,000, $1,000 and $500 for the top three teams at the Campus Grand Finale.' },
  { icon: Plane, title: 'A trip to Nationals', text: 'Up to three teams represent UWindsor in Calgary. The winning team’s travel is covered.' },
]

/** What the chapter gives every team, as four cards. */
export function AboutOffers() {
  return <>
    <ul className="about-offers">{OFFERS.map(offer => <li key={offer.title} className="about-offer">
      <span className="about-offer__icon" aria-hidden="true"><offer.icon strokeWidth={2} /></span>
      <h3>{offer.title}</h3>
      <p>{offer.text}</p>
    </li>)}</ul>
    <Link className="text-link about-offers__more" to="/this-year#calendar">See this season’s dates <span aria-hidden="true">→</span></Link>
  </>
}

/** Three ways in, as sticky notes stuck up by hand: each a different pad, size and lean. */
export function GetInvolved() {
  return <ul className="about-ways">
    <li className="about-way about-way--yellow">
      <h3>Compete</h3>
      <p>Bring an idea and a team of two to four. Registration closes {SITE.registrationCloses}.</p>
      <a href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">Register your team <span aria-hidden="true">↗</span></a>
    </li>
    <li className="about-way about-way--pink">
      <h3>Come to an event</h3>
      <p>Free workshops, info sessions and the Campus Grand Finale, with drinks and snacks provided.</p>
      <Link to="/attend">See upcoming events <span aria-hidden="true">→</span></Link>
    </li>
    <li className="about-way about-way--blue">
      <h3>Mentor, judge or partner</h3>
      <p>Judge the Grand Finale, mentor a team for a few hours or lead a workshop.</p>
      <Link to="/partners">Ways to support <span aria-hidden="true">→</span></Link>
    </li>
  </ul>
}
