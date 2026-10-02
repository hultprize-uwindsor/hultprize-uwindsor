import { RevealText } from './MotionText'
import { Link } from 'react-router-dom'
import { committee } from '../data/committee'
import { YEAR_ONE_PHOTOS } from '../data/assets'
import { COMMUNITY_PARTNERS } from '../data/communityPartners'

export function TeamGallery() {
  return <div className="people-gallery">
    {committee.map(([name, role, , slug]) => <Link className="person-tile" key={slug} to={`?member=${slug}#team`} state={{ drawer: true }}>
      <img src={`/images/team/${slug}.png`} alt="" width={1080} height={1440} loading="lazy" />
      <span className="person-tile__arrow" aria-hidden="true">↗</span>
      {/* The portrait artwork already includes the name and role. Keep live text for screen readers. */}
      <div className="visually-hidden"><h3>{name}</h3><p>{role}</p><span>View profile</span></div>
    </Link>)}
  </div>
}
export function SeasonGallery() {
  return <section className="section season-gallery" id="pictures"><div className="container"><div className="section-heading"><span className="tag">2025–2026</span><h2 data-text-reveal><RevealText>Year one.<br />In pictures.</RevealText></h2></div><div className="season-gallery__grid">{YEAR_ONE_PHOTOS.map((photo,i)=><Link to={`?photo=${i}`} state={{drawer:true}} key={photo.src}><figure><img src={photo.src} alt={photo.alt} loading="lazy"/><figcaption>{photo.caption}<span aria-hidden="true">↗</span></figcaption></figure></Link>)}</div></div></section>
}
export function PartnerGallery() {
  return <div className="partner-gallery">{COMMUNITY_PARTNERS.map((p,i)=><Link key={p.slug} className={`partner-tile partner-tile--${i}`} to={`?partner=${p.slug}`} state={{drawer:true}}><div className="partner-tile__visual">{p.logo&&<img src={p.logo} alt="" loading="lazy"/>}<span aria-hidden="true">↗</span></div><h3>{p.name}</h3><p>{p.subtitle}</p></Link>)}</div>
}
