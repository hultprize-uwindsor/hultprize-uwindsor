import { Link, useParams } from 'react-router-dom'
import { Copy, PageHeader, Section } from '../components/PageParts'
import { findCommunityPartner } from '../data/communityPartners'
import { NotFoundPage } from './EventsPage'

// One page per community partner (/partners/<slug>), reached from the header's Partners menu.
export default function PartnerPage() {
  const partner = findCommunityPartner(useParams().slug)
  if (!partner) return <NotFoundPage />
  const card = <aside className="partner-card" aria-label={partner.name}>
    {partner.logo && <span className="partner-card__logo"><img src={partner.logo} alt={`${partner.name} logo`} /></span>}
    {partner.url && <a className="btn btn--secondary" href={partner.url} target="_blank" rel="noopener noreferrer">Visit their website <span aria-hidden="true">↗</span></a>}
  </aside>
  // The logo card sits beside the first section with copy: About once written, otherwise With us.
  return <><PageHeader title={partner.name} subtitle={partner.subtitle} />
    {partner.about.length > 0 && <Section title={`About ${partner.name}`}><div className="partner-profile"><Copy paragraphs={partner.about} />{card}</div></Section>}
    <Section title="With Hult Prize UWindsor" tint="paper-blue"><div className={partner.about.length > 0 ? undefined : 'partner-profile'}><Copy paragraphs={partner.withUs} />{partner.about.length > 0 ? null : card}</div><Link className="text-link" to="/partners">All partners and ways to support us →</Link></Section>
  </>
}
