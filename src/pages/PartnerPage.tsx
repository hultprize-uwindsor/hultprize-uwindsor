import { RevealText, RollingLabel } from '../components/MotionText'
import { useParams } from 'react-router-dom'
import { Link } from '../components/PageLink'
import { Copy, PageLayout, Section } from '../components/PageParts'
import { COMMUNITY_PARTNERS, findCommunityPartner, type PartnerPerson, type PartnerResource } from '../data/communityPartners'
import { NotFoundPage } from './EventsPage'
import './PartnerPage.css'

const nextSteps: Record<string, { title: string; text: string; to: string; label: string }> = {
  fusion: { title: 'Visit Fusion', text: 'Find our campus headquarters, opening hours and directions.', to: '/contact#come-and-find-us', label: 'Plan your visit' },
  sterling: { title: 'Prepare your pitch', text: 'Choose from five free workshop sessions in the live event calendar.', to: '/this-year#calendar', label: 'See the workshop schedule' },
  wetech: { title: 'See what the support made possible', text: 'Fourteen student startups entered Windsor’s first season.', to: '/year-one', label: 'Explore year one' },
}

/** One of the partner's people as a taped Polaroid: their official photo with their name written on the white strip,
    then their title and what they do for students. The photo's alt is empty because the name sits right under it. */
function Person({ person }: { person: PartnerPerson }) {
  return <li className="partner-person">
    <div className="partner-person__polaroid">
      <span className="tape" aria-hidden="true" />
      {person.photo ? <img src={person.photo} alt="" width={384} height={480} loading="lazy" decoding="async" /> : <span className="partner-person__initials" aria-hidden="true">{person.name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span>}
      <h3 className="partner-person__name">{person.name}</h3>
    </div>
    <p className="partner-person__title">{person.title}</p>
    {person.role && <p className="partner-person__role">{person.role}</p>}
    {person.profile && <a className="text-link" href={person.profile} target="_blank" rel="noopener noreferrer">Read their profile <span aria-hidden="true">↗</span><span className="visually-hidden">: {person.name}</span></a>}
  </li>
}

/** A resource students can use: what it is, who it's for, what it costs and how to get it. */
function Resource({ resource }: { resource: PartnerResource }) {
  return <li className="partner-resource">
    <h3>{resource.name}</h3>
    <p>{resource.text}</p>
    <dl>
      {resource.who && <div><dt>Who it’s for</dt><dd>{resource.who}</dd></div>}
      {resource.cost && <div><dt>Cost</dt><dd>{resource.cost}</dd></div>}
      <div><dt>How to get it</dt><dd>{resource.access}</dd></div>
    </dl>
    {resource.link && (resource.link[0].startsWith('mailto:')
      ? <a className="text-link" href={resource.link[0]}>{resource.link[1]}<span className="visually-hidden">: {resource.name}</span></a>
      : <a className="text-link" href={resource.link[0]} target="_blank" rel="noopener noreferrer">{resource.link[1]} <span aria-hidden="true">↗</span></a>)}
  </li>
}

export default function PartnerPage() {
  const partner = findCommunityPartner(useParams().slug)
  if (!partner) return <NotFoundPage />
  const next = nextSteps[partner.slug]
  return <PageLayout className="partner-page" title={partner.name} subtitle={partner.subtitle}>
    <Section tint="partner-overview">
      <div className="partner-profile">
        <div>
          <h2 data-text-reveal><RevealText>{`How ${partner.shortName} supports us`}</RevealText></h2>
          <Copy paragraphs={partner.withUs} />
          {partner.support.length > 0 && <ol className="partner-support">{partner.support.map(item => <li key={item.title}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ol>}
        </div>
        <aside className="partner-card" aria-label={partner.name}>
          {partner.logo && <span className="partner-card__logo"><img src={partner.logo} alt={`${partner.name} logo`} /></span>}
          <p>{partner.subtitle}</p>
          {partner.email && <a className="text-link" href={`mailto:${partner.email}`}>{partner.email}</a>}
          {partner.url && <a className="text-link" href={partner.url} target="_blank" rel="noopener noreferrer">Visit their website <span aria-hidden="true">↗</span></a>}
        </aside>
      </div>
    </Section>
    {partner.resources.length > 0 && <Section title="What students can use" tint="paper-pink partner-resources-section">
      {partner.resourcesIntro && <p className="prose partner-section-intro">{partner.resourcesIntro}</p>}
      <ul className="partner-resources">{partner.resources.map(resource => <Resource key={resource.name} resource={resource} />)}</ul>
    </Section>}
    {partner.people.length > 0 && <Section title={`Meet the people at ${partner.shortName}`} tint="partner-people-section">
      {partner.peopleIntro && <p className="prose partner-section-intro">{partner.peopleIntro}</p>}
      <ul className={`partner-people${partner.people.length > 4 ? ' partner-people--rows-of-three' : ''}`}>{partner.people.map(person => <Person key={person.name} person={person} />)}</ul>
    </Section>}
    {partner.about.length > 0 && <Section title="About the organisation" tint="paper-blue editorial-section"><Copy paragraphs={partner.about} /></Section>}
    <Section tint="partner-next">
      <div className="page-next"><div><h2 data-text-reveal><RevealText>{next.title}</RevealText></h2><p>{next.text}</p></div><Link className="btn btn--secondary" to={next.to}><RollingLabel>{next.label}</RollingLabel><span aria-hidden="true">→</span></Link></div>
      <nav className="related-links" aria-label="More partners"><Link to="/partners">Partnership overview <span aria-hidden="true">→</span></Link>{COMMUNITY_PARTNERS.filter(p => p.slug !== partner.slug).map(p => <Link key={p.slug} to={`/partners/${p.slug}`}>{p.name} <span aria-hidden="true">→</span></Link>)}</nav>
    </Section>
  </PageLayout>
}
