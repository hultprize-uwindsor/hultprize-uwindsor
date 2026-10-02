import { RevealText, RollingLabel } from '../components/MotionText'
import { Link, useParams } from 'react-router-dom'
import { Copy, PageHeader, Section } from '../components/PageParts'
import { COMMUNITY_PARTNERS, findCommunityPartner } from '../data/communityPartners'
import { NotFoundPage } from './EventsPage'

const nextSteps: Record<string, { title: string; text: string; to: string; label: string }> = {
  fusion: { title: 'Visit Fusion', text: 'Find our campus headquarters, opening hours and directions.', to: '/contact#come-and-find-us', label: 'Plan your visit' },
  sterling: { title: 'Prepare your pitch', text: 'Five workshop sessions run from November 7 through January 9.', to: '/this-year#calendar', label: 'See the workshop schedule' },
  wetech: { title: 'See what the support made possible', text: 'Fourteen student startups entered Windsor’s first season.', to: '/year-one', label: 'Explore year one' },
}

export default function PartnerPage() {
  const partner = findCommunityPartner(useParams().slug)
  if (!partner) return <NotFoundPage />
  const next = nextSteps[partner.slug]
  return <div className="partner-page">
    <PageHeader title={partner.name} subtitle={partner.subtitle} />
    <Section tint="partner-overview">
      <div className="partner-profile">
        <div><p className="eyebrow">With Hult Prize UWindsor</p><h2 data-text-reveal><RevealText>Supporting student founders</RevealText></h2><Copy paragraphs={partner.withUs} /></div>
        <aside className="partner-card" aria-label={partner.name}>
          {partner.logo && <span className="partner-card__logo"><img src={partner.logo} alt={`${partner.name} logo`} /></span>}
          <p>{partner.subtitle}</p>
          {partner.url && <a className="text-link" href={partner.url} target="_blank" rel="noopener noreferrer">Visit their website <span aria-hidden="true">↗</span></a>}
        </aside>
      </div>
    </Section>
    {partner.about.length > 0 && <Section title="About the organisation" tint="paper-blue editorial-section"><Copy paragraphs={partner.about} /></Section>}
    <Section tint="partner-next">
      <div className="page-next"><div><p className="eyebrow">For students</p><h2 data-text-reveal><RevealText>{next.title}</RevealText></h2><p>{next.text}</p></div><Link className="btn btn--secondary" to={next.to}><RollingLabel>{next.label}</RollingLabel><span aria-hidden="true">→</span></Link></div>
      <nav className="related-links" aria-label="More partners"><Link to="/partners">Partnership overview <span aria-hidden="true">→</span></Link>{COMMUNITY_PARTNERS.filter(p => p.slug !== partner.slug).map(p => <Link key={p.slug} to={`/partners/${p.slug}`}>{p.name} <span aria-hidden="true">→</span></Link>)}</nav>
    </Section>
  </div>
}
