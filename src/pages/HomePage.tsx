import CountUpText from '../components/CountUpText'
import { Link } from 'react-router-dom'
import copy from '../data/copy.json'
import CampusPhoto from '../components/CampusPhoto'
import { SHOW_EVENT_PHOTOS } from '../data/assets'
import { Copy, CTABand, RegisterButton, Section, Stats, Timeline } from '../components/PageParts'

export default function HomePage() {
  return <>
    <section className="home-hero"><div className="container"><p className="eyebrow">Windsor ideas. Worldwide ambition.</p><h1>One idea, 4 minutes, <CountUpText value="$1,000,000" />.</h1><div className={SHOW_EVENT_PHOTOS ? "hero-content hero-content--photos" : "hero-content"}><div><Copy paragraphs={copy.homeHero} /><div className="button-row"><RegisterButton /><Link className="btn btn--secondary" to="/partners">Partner with us</Link></div></div><CampusPhoto photo="room" priority /></div></div></section>
    <section className="container" aria-label="Last year, in four numbers"><Stats animate={false} /></section>
    <Section eyebrow="From year one to what’s next" title="Built here. Ready to go further." tint="paper-pink"><Copy paragraphs={copy.homeIntro} /></Section>
    <Section eyebrow="Find your place" title="Three ways in"><div className="card-row">{['Compete', 'Partner', 'Understand it'].map((title, i) => <article className="entry-card" key={title}><CampusPhoto photo={(["pitch", "community", "audience"] as const)[i]} className="entry-card__photo" />{!SHOW_EVENT_PHOTOS && <span className="card-number" aria-hidden="true">0{i + 1}</span>}<h3>{title}</h3><p>{copy.homeCards[i]}</p><Link to={['/compete', '/partners', '/about'][i]}>{['How to enter', 'How partnership works', 'About the competition'][i]} <span aria-hidden="true">↗</span></Link></article>)}</div></Section>
    <Section eyebrow="2026 to 2027" title="The dates that matter" tint="paper-blue" id="key-dates"><Timeline compact /><Link className="text-link" to="/this-year">The full calendar →</Link></Section>
    <CTABand text="Registration closes November 20. Four minutes is less time than it sounds." />
  </>
}
