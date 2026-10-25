import type { CSSProperties } from 'react'
import { BookOpen, MapPin, Medal, Plane, Trophy, UsersRound } from 'lucide-react'
import { Link } from './PageLink'
import { RevealText } from './MotionText'
import { HOME_BOARD_PHOTOS } from '../data/assets'
import { SITE } from '../data/site'
import { useAttendanceEvents } from '../lib/attendance'
import './pushpin.css'
import './AboutSections.css'

// Approved board photos, pinned beside the introduction. Each is shown whole.
const INTRO_PHOTOS = [['year-one-0653', 'Year one', '#ff329b'], ['launch-1860', 'Launch day', '#2f80d1']] as const

/** Why the chapter exists, its proof points as stickers, and two pinned photos. */
export function AboutIntro() {
  const photos = INTRO_PHOTOS.flatMap(([name, caption, pin]) => {
    const photo = HOME_BOARD_PHOTOS.find(item => item.name === name)
    return photo ? [{ ...photo, caption, pin }] : []
  })
  return <div className={`about-intro${photos.length ? '' : ' about-intro--text'}`}>
    <div>
      <p className="eyebrow">Hult Prize at UWindsor</p>
      <h2 data-text-reveal><RevealText>Why we’re here</RevealText></h2>
      <div className="prose">
        <p>Hult Prize at UWindsor helps students from every program turn an idea into a business that solves a real problem. We run the University of Windsor’s campus round of the global competition, with free workshops, mentors and team matching.</p>
        <p>In our first season, 14 student startups entered, six reached the Grand Finale and two went on to Nationals. The Hult Prize Foundation named UWindsor the Best Program in North America.</p>
      </div>
      <ul className="about-stickers" aria-label="Year one highlights">
        <li className="about-sticker about-sticker--award">Best Program in North America</li>
        <li className="about-sticker about-sticker--navy">14 startups in year one</li>
        <li className="about-sticker about-sticker--gold">Top 8 in Canada</li>
      </ul>
    </div>
    {photos.length > 0 && <div className="about-polaroids" aria-hidden="true">{photos.map(photo => <figure key={photo.name} className="about-polaroid" style={{ '--pin': photo.pin } as CSSProperties}>
      <span className="pin" />
      <img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 760px) 70vw, 360px" alt="" loading="lazy" />
      <figcaption>{photo.caption}</figcaption>
    </figure>)}</div>}
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
  { icon: Medal, title: 'Campus prizes', text: '$1,000, $500 and $250 for the top three teams at the Campus Grand Finale.' },
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

/** Three ways in, as pinned sticky notes. */
export function GetInvolved() {
  return <ul className="about-ways">
    <li className="about-way about-way--yellow" style={{ '--pin': '#ff329b' } as CSSProperties}>
      <span className="pin" aria-hidden="true" />
      <h3>Compete</h3>
      <p>Bring an idea and a team of two to four. Registration closes {SITE.registrationCloses}.</p>
      <a href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">Register your team <span aria-hidden="true">↗</span></a>
    </li>
    <li className="about-way about-way--pink" style={{ '--pin': '#2f80d1' } as CSSProperties}>
      <span className="pin" aria-hidden="true" />
      <h3>Come to an event</h3>
      <p>Free workshops, info sessions and the Campus Grand Finale, with drinks and snacks provided.</p>
      <Link to="/attend">See upcoming events <span aria-hidden="true">→</span></Link>
    </li>
    <li className="about-way about-way--blue" style={{ '--pin': '#2fbf97' } as CSSProperties}>
      <span className="pin" aria-hidden="true" />
      <h3>Mentor, judge or partner</h3>
      <p>Judge the Grand Finale, mentor a team for a few hours or lead a workshop.</p>
      <Link to="/partners">Ways to support <span aria-hidden="true">→</span></Link>
    </li>
  </ul>
}
