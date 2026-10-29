import { RevealText } from './MotionText'
import { Link } from './PageLink'
import { PARTNERS, CURRENT_PARTNERS } from '../data/partners'
import { ThreeDScrollTriggerContainer, ThreeDScrollTriggerRow } from './ThreeDScrollTrigger'
import './PartnerShowcase.css'

export function PartnerGrid({ linked = false }: { linked?: boolean }) {
  return <div className="partner-showcase">
    <ThreeDScrollTriggerContainer>
      <ThreeDScrollTriggerRow baseVelocity={.8} direction={1} aria-label="Year one partners">
        {PARTNERS.map(partner => {
          const content = <>{partner.individual ? <strong className="partner-person">{partner.name}</strong> : <div className="partner-placeholder">{partner.name}</div>}{!linked && <p>{partner.role}</p>}</>
          return linked ? <Link className="partner-motion-card" key={partner.name} to="/year-one" aria-label={`${partner.name}: meet our year one partners`}>{content}</Link> : <a className="partner-motion-card" key={partner.name} href={partner.url} target="_blank" rel="noopener noreferrer">{content}</a>
        })}
      </ThreeDScrollTriggerRow>
    </ThreeDScrollTriggerContainer>
  </div>
}

/** The "Supported by" logo strip above the footer. Several offices share the University's or the UWSA's logo, so each
    logo appears once, linked to the first partner listed with it. A sponsor whose logo hasn't arrived shows its name. */
export function PartnerStrip() {
  const partners = [...PARTNERS.filter(p => !p.individual), ...CURRENT_PARTNERS].filter((partner, i, all) => !partner.logo || all.findIndex(other => other.logo === partner.logo) === i)
  return <section className="partner-strip" id="supporters" aria-label="Our partners">
    <div className="container"><div className="partner-strip__heading"><h2 data-text-reveal><RevealText>Supported by</RevealText></h2></div></div>
    <ThreeDScrollTriggerContainer>
      <ThreeDScrollTriggerRow baseVelocity={1} direction={1} aria-label="Supporting organisations">
        {partners.map(partner => {
          const mark = partner.logo ? (
            <span className="partner-logo-box">
              <img src={partner.logo} alt={partner.name} loading="lazy" />
            </span>
          ) : (
            <span className="partner-logo-box partner-logo-box--name">{partner.name}</span>
          )
          return partner.url
            ? <a className="partner-motion-logo" key={partner.name} href={partner.url} target="_blank" rel="noopener noreferrer">{mark}</a>
            : <span className="partner-motion-logo" key={partner.name}>{mark}</span>
        })}
      </ThreeDScrollTriggerRow>
    </ThreeDScrollTriggerContainer>
  </section>
}
