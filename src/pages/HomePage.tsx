import { Link } from 'react-router-dom'
import copy from '../data/copy.json'
import CampusPhoto from '../components/CampusPhoto'
import { SHOW_EVENT_PHOTOS } from '../data/assets'
import { Copy, CTABand, RegisterButton, Section, Stats, Timeline } from '../components/PageParts'

// Section order follows the hultprize.org homepage: hero, intro and numbers on a dark-blue band,
// a full-bleed photo, then the ways in. A winners section waits for real student quotes.
export default function HomePage() {
  return <>
    <section className="home-hero"><div className="container"><h1>One idea, 4&nbsp;minutes, $1,000,000.</h1><Copy paragraphs={copy.homeHero} /><div className="button-row"><RegisterButton /><Link className="btn btn--secondary" to="/partners">Partner with us</Link></div></div></section>
    <Section title="Built here. Ready to go further." tint="navy-band"><Copy paragraphs={copy.homeIntro} /><Link className="btn btn--secondary" to="/about">About the competition</Link><Stats /></Section>
    <CampusPhoto photo="room" className="campus-photo--bleed" />
    <Section eyebrow="Find your place" title="Three ways in" tint="section-centred"><div className="card-row">{['Compete', 'Partner', 'Understand it'].map((title, i) => <article className="entry-card" key={title}><CampusPhoto photo={(["pitch", "community", "audience"] as const)[i]} className="entry-card__photo" />{!SHOW_EVENT_PHOTOS && <span className="card-number" aria-hidden="true">0{i + 1}</span>}<h3>{title}</h3><p>{copy.homeCards[i]}</p><Link to={['/compete', '/partners', '/about'][i]}>{['How to enter', 'How partnership works', 'About the competition'][i]} <span aria-hidden="true">→</span></Link></article>)}</div></Section>
    <Section eyebrow="2026 to 2027" title="The dates that matter" tint="paper-blue" id="key-dates"><Timeline compact /><Link className="text-link" to="/this-year">The full calendar →</Link></Section>
    <CTABand lede="Four minutes is less time than it sounds." />
  </>
}
