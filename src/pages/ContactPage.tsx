import { RevealText, RollingLabel } from '../components/MotionText'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import copy from '../data/copy.json'
import { SITE } from '../data/site'
import { findCommunityPartner } from '../data/communityPartners'
import { committee } from '../data/committee'
import { CTABand } from '../components/PageParts'
import './ContactPage.css'

// Keep visits, contact channels and committee responsibilities directly linkable.
const PHONE = { text: '519 253 3000, extension 3515', href: 'tel:+15192533000;ext=3515' }
const ADDRESS = 'Joyce Entrepreneurship Centre, 2455 Wyandotte St. W., Windsor, ON N9B 0C1'
const MAP_EMBED = 'https://maps.google.com/maps?q=Joyce%20Entrepreneurship%20Centre%202455%20Wyandotte%20St%20W%20Windsor&output=embed'
// Opens turn-by-turn directions, in the Maps app on a phone.
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`
const fusion = findCommunityPartner('fusion')

// External links open in a new tab and say so to screen readers; the arrow is the visible cue.
function NewTab({ glued = true }: { glued?: boolean }) {
  return <><span aria-hidden="true">{glued ? ' ↗' : '↗'}</span><span className="visually-hidden"> (opens in a new tab)</span></>
}
// A text link to another page of the site, its arrow kept on the line with the last word.
function More({ to, children }: { to: string; children: string }) {
  return <Link to={to}>{children}<span aria-hidden="true">{' →'}</span></Link>
}
// Lets an address wrap before the @ rather than mid-domain.
function EmailText({ address }: { address: string }) {
  const [user, domain] = address.split('@')
  return <>{user}<wbr />@{domain}</>
}
type IconName = 'email' | 'phone' | 'instagram' | 'linkedin' | 'chat'
// Drawn like the footer's icons: 24px, 1.7 stroke, round joins, hidden from assistive tech.
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'email' && <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}
    {name === 'phone' && <path d="M21 16.4v2.7a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3 4.9 1.8 1.8 0 0 1 4.8 3h2.7a1.8 1.8 0 0 1 1.8 1.5c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9L8.3 10.1a14.4 14.4 0 0 0 5.4 5.4l1.2-1.2a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.5 1.9z" />}
    {name === 'instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></>}
    {name === 'linkedin' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M11 17v-7m0 3a3 3 0 0 1 6 0v4" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /></>}
    {name === 'chat' && <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />}
  </svg>
}

// One card per way in; email and phone lead the row. Each of these whole cards is its link.
const channels: { label: string; text: ReactNode; href: string; icon: IconName; external?: boolean }[] = [
  { label: 'Email', text: <EmailText address={SITE.contactEmail} />, href: `mailto:${SITE.contactEmail}`, icon: 'email' },
  { label: 'Phone', text: PHONE.text, href: PHONE.href, icon: 'phone' },
  { label: 'Instagram', text: SITE.instagramHandle, href: SITE.instagramUrl, icon: 'instagram', external: true },
  { label: 'LinkedIn', text: 'Hult Prize at the University of Windsor', href: SITE.linkedinUrl, icon: 'linkedin', external: true },
]
// The footer's two Signal groups share the last card, named as the footer names them.
const chats = [['Registered teams', SITE.signalRegisteredUrl], ['Looking for a team', SITE.signalLookingUrl]]

// Who handles what, read off each committee role so a renamed or reordered committee keeps its rows right.
// Partners are the likeliest visitors who are not students, so they come first; the director is the catch-all, so last.
// Leads come before coordinators, and a topic with nobody in it is left out.
const topics: { topic: string; role: RegExp; more?: [string, string] }[] = [
  { topic: 'Partnerships and sponsorships', role: /Partnerships/, more: ['/partners', 'How partnership works'] },
  { topic: 'Judges, experts and course integrations', role: /Judges/ },
  { topic: 'Events and outreach', role: /Events/, more: ['/events', 'All events'] },
  { topic: 'Marketing and media', role: /Marketing/ },
  { topic: 'Campus Director', role: /Campus Director/ },
]
const isCoordinator = (role: string) => Number(/Coordinator/.test(role))
const whoToAsk = topics
  .map(({ topic, role, more }) => ({ topic, more, members: committee.filter(([, memberRole]) => role.test(memberRole)).sort((a, b) => isCoordinator(a[1]) - isCoordinator(b[1])) }))
  .filter(({ members }) => members.length > 0)
// Under a topic the role's last word says enough (Lead or Coordinator); the director's topic is the role itself.
const rankOf = (role: string, topic: string) => role === topic ? '' : role.split(' ').pop()

export default function ContactPage() {
  return <div className="contact-page">
    <header className="page-heading contact-hero"><div className="container">
      <div><p className="eyebrow">Hult Prize · UWindsor</p><h1 data-text-reveal><RevealText>Find us.</RevealText></h1></div>
      <div className="contact-hero__intro"><p>Visit Fusion, ask about the competition or contact the team.</p><div className="contact-actions">
        <Link className="btn btn--dark" to="?enquiry=general" state={{drawer:true}}><RollingLabel>Ask the team</RollingLabel><span aria-hidden="true">↗</span></Link>
        <a className="btn btn--white" href={DIRECTIONS} target="_blank" rel="noopener noreferrer"><RollingLabel>Get directions</RollingLabel><NewTab glued={false} /></a>
      </div></div>
    </div></header>

    <div className="contact-content">
    <nav className="container contact-section-nav" aria-label="On this page"><Link to="#come-and-find-us">Visit Fusion <span aria-hidden="true">↓</span></Link><Link to="#reach-us">Get in touch <span aria-hidden="true">↓</span></Link><Link to="#who-to-ask">Find the right person <span aria-hidden="true">↓</span></Link></nav>

    <section className="contact-place" aria-labelledby="come-and-find-us"><div className="container contact-place__grid">
      <div className="contact-place__head">
        <p className="eyebrow">Come by</p>
        <h2 id="come-and-find-us" data-text-reveal><RevealText>Visit Fusion</RevealText></h2>
        <address>Joyce Entrepreneurship Centre<br />2nd{' '}Floor · 2455 Wyandotte St.{' '}W.<br />Windsor, ON N9B{' '}0C1</address>
      </div>
      <dl className="contact-place__details">
        <div><dt>Getting there</dt><dd>Southeast corner of Wyandotte Street West and Sunset Avenue.</dd></div>
        <div><dt>Hours</dt><dd>Monday to Friday, 9am to 4pm.</dd></div>
        {/* The number is the target, so it gets its own 44px line above the note; its full stop stays outside the link. */}
        <div><dt>Phone</dt><dd><span className="contact-place__line"><a href={PHONE.href}>{PHONE.text}</a></span><span className="contact-place__note">Ask for Hult Prize at Fusion.</span></dd></div>
        <div><dt>Email</dt><dd><span className="contact-place__line"><a href={`mailto:${SITE.contactEmail}`}><EmailText address={SITE.contactEmail} /></a></span></dd></div>
      </dl>
      <div className="contact-place__map">
        <iframe title="Google map of the Joyce Entrepreneurship Centre, 2455 Wyandotte St. W., Windsor, home of Fusion" src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
    </div></section>

    <section className="section contact-fusion" aria-labelledby="inside-fusion"><div className="container contact-fusion__grid">
      <div className="contact-fusion__heading">
        <p className="eyebrow">Fusion</p>
        <h2 id="inside-fusion" data-text-reveal><RevealText>Open to all students.</RevealText></h2>
      </div>
      <div className="contact-fusion__body">
        <div className="contact-fusion__copy">{copy.contactIntro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        {fusion && <div className="contact-fusion__links">
          <More to={`/partners/${fusion.slug}`}>About Fusion</More>
          {fusion.url && <a href={fusion.url} target="_blank" rel="noopener noreferrer">Fusion’s website<NewTab /></a>}
        </div>}
      </div>
    </div></section>

    <section className="section contact-reach" aria-labelledby="reach-us"><div className="container">
      <div className="contact-section-heading"><p className="eyebrow">A few ways to reach us</p><h2 id="reach-us" data-text-reveal><RevealText>Get in touch.</RevealText></h2></div>
      <ul className="contact-channels">
        {channels.map(({ label, text, href, icon, external }) => <li key={label}>
          <a className="contact-card" href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            <span className="contact-card__icon"><Icon name={icon} /></span>
            <span className="contact-card__label">{label}</span>
            <span className="contact-card__value">{text}{external && <NewTab />}</span>
          </a>
        </li>)}
        <li><div className="contact-card">
          <span className="contact-card__icon"><Icon name="chat" /></span>
          <span className="contact-card__label">Signal chats</span>
          <span className="contact-card__links">{chats.map(([text, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer">{text}<NewTab /></a>)}</span>
        </div></li>
      </ul>
    </div></section>

    <section className="section contact-ask" aria-labelledby="who-to-ask"><div className="container">
      <div className="contact-ask__heading">
        <div><p className="eyebrow">The people behind the programme</p><h2 id="who-to-ask" data-text-reveal><RevealText>Find the<br />right person.</RevealText></h2></div>
        <More to="/about#team">Meet the team</More>
      </div>
      <ul className="contact-people">{whoToAsk.map(({ topic, more, members }) => <li key={topic} className={`contact-people__group${topic === 'Campus Director' ? ' contact-people__group--general' : ''}`}>
        <div className="contact-people__heading"><h3>{topic}</h3>{topic === 'Campus Director' && <p>For anything else, start here.</p>}</div>
        <ul className="contact-people__names">{members.map(([name, role, email, portrait]) => { const rank = rankOf(role, topic); return <li key={email}>
          <div className="contact-people__identity"><Link className="contact-people__profile" to={`?member=${portrait}`} state={{drawer:true}}><strong>{name}</strong><span aria-hidden="true">↗</span><span className="visually-hidden"> — view profile</span></Link>{rank && <span className="contact-people__rank">{rank}</span>}</div>
          <a href={`mailto:${email}`}><Icon name="email" /><span><EmailText address={email} /></span><span className="visually-hidden"> — email {name}</span></a>
        </li> })}</ul>
        {more && <p className="contact-people__more"><More to={more[0]}>{more[1]}</More></p>}
      </li>)}</ul>
    </div></section>

    <CTABand text="Ready to enter?" lede="Check eligibility, find teammates and register your team."><Link className="btn btn--primary" to="/compete"><RollingLabel>How to compete</RollingLabel><span aria-hidden="true">→</span></Link></CTABand>
    </div>
  </div>
}
