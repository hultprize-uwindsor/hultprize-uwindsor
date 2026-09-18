import { Link } from 'react-router-dom'
import { PARTNERS, CURRENT_PARTNERS } from '../data/partners'
import { ThreeDScrollTriggerContainer, ThreeDScrollTriggerRow } from './ThreeDScrollTrigger'
import './PartnerShowcase.css'

export function PartnerGrid({ linked = false }: { linked?: boolean }) {
  return <div className="partner-showcase">
    <ThreeDScrollTriggerContainer>
      <ThreeDScrollTriggerRow baseVelocity={.8} direction={1} aria-label="Year one partners">
        {PARTNERS.map(partner => {
          const content = <>{partner.individual ? <strong className="partner-person">{partner.name}</strong> : <div className="partner-placeholder">{partner.name}</div>}{!linked && <p>{partner.role}</p>}</>
          return linked ? <Link className="partner-motion-card" key={partner.name} to="/year-one" aria-label={`${partner.name} — meet our year one partners`}>{content}</Link> : <a className="partner-motion-card" key={partner.name} href={partner.url} target="_blank" rel="noopener noreferrer">{content}</a>
        })}
      </ThreeDScrollTriggerRow>
    </ThreeDScrollTriggerContainer>
  </div>
}

export function PartnerStrip() {
  const partners = [...PARTNERS.filter(p => !p.individual), ...CURRENT_PARTNERS]
  return <section className="partner-strip" id="supporters" aria-label="Our partners">
    <div className="container"><p className="eyebrow">Our partners</p><div className="partner-strip__heading"><h2>Supported by</h2></div></div>
    <ThreeDScrollTriggerContainer>
      <ThreeDScrollTriggerRow baseVelocity={1} direction={1} aria-label="Supporting organisations">
        {partners.map(partner => <a className="partner-motion-logo" key={partner.name} href={partner.url} target="_blank" rel="noopener noreferrer"><span className="partner-placeholder">{partner.name}</span></a>)}
      </ThreeDScrollTriggerRow>
    </ThreeDScrollTriggerContainer>
  </section>
}
