import { HeroTitle, RevealText, RollingLabel } from '../components/MotionText'
import { useEffect, useState } from 'react'
import { Link } from '../components/PageLink'
import copy from '../data/copy.json'
import { SITE } from '../data/site'
import { findCommunityPartner } from '../data/communityPartners'
import { committee } from '../data/committee'
import { CTABand } from '../components/PageParts'
import './ContactPage.css'

// Keep the contact details, who to ask and the visit directly linkable.
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

// Where to find us online.
const online: { label: string; text: string; href: string; icon: IconName }[] = [
  { label: 'Instagram', text: SITE.instagramHandle, href: SITE.instagramUrl, icon: 'instagram' },
  { label: 'LinkedIn', text: 'Hult Prize at the University of Windsor', href: SITE.linkedinUrl, icon: 'linkedin' },
  { label: 'Discord', text: 'Join our Discord', href: SITE.discordUrl, icon: 'chat' },
]
// What people come to ask about, each with who handles it (read off the committee roles, so a renamed or reordered
// committee keeps its rows right), the contact form's matching topic and the pages that answer the most. Competing has
// no single owner on the committee, so it goes through the form and the Compete page. The director is the catch-all,
// so last; leads come before coordinators.
const needs: { topic: string; text: string; role?: RegExp; form: string; links?: [to: string, label: string, external?: boolean][] }[] = [
  { topic: 'Entering the competition', text: 'Eligibility, teams, registration and workshops.', form: 'competing', links: [['/compete', 'How to compete'], [SITE.registrationUrl, 'Register your team', true]] },
  { topic: 'Partnerships and sponsorships', text: 'Funding the program, sponsoring a prize or partnering on an event.', role: /Partnerships/, form: 'partnership', links: [['/partners', 'How partnership works']] },
  { topic: 'Judges, experts and course integrations', text: 'Judging the Grand Finale, mentoring a team or bringing Hult Prize into a course.', role: /Judges/, form: 'mentoring' },
  { topic: 'Events and outreach', text: 'Our workshops, info sessions and campus events.', role: /Events/, form: 'general', links: [['/events', 'All events']] },
  { topic: 'Marketing and media', text: 'Press, photos and social media.', role: /Marketing/, form: 'media' },
  { topic: 'Anything else', text: 'Not sure who to ask? Start with the Campus Director.', role: /Campus Director/, form: 'general' },
]
const isCoordinator = (role: string) => Number(/Coordinator/.test(role))
const routes = needs.map(need => ({ ...need, members: need.role ? committee.filter(([, role]) => need.role!.test(role)).sort((a, b) => isCoordinator(a[1]) - isCoordinator(b[1])) : [] }))
  .filter(need => !need.role || need.members.length > 0)

/** Copies a detail to the clipboard, says so for a moment, and announces it to screen readers. Beside its detail it
    reads just "Copy"; on its own it names what it copies. */
function CopyButton({ text, label, named = false }: { text: string; label: string; named?: boolean }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true) } catch { /* Clipboard blocked: the text itself stays selectable. */ }
  }
  return <>
    <button type="button" className="copy-button" onClick={copy}>{copied ? 'Copied' : named ? `Copy ${label.toLowerCase()}` : <>Copy<span className="visually-hidden"> {label.toLowerCase()}</span></>}</button>
    <span className="visually-hidden" role="status">{copied ? `${label} copied` : ''}</span>
  </>
}

export default function ContactPage() {
  return <div className="contact-page">
    <header className="page-heading contact-hero"><div className="container">
      <div><HeroTitle>Find us.</HeroTitle></div>
      <div className="contact-hero__intro"><p>Visit Fusion, ask about the competition or contact the team.</p><div className="contact-actions">
        <Link className="btn btn--dark" to="?enquiry=general" state={{drawer:true}}><RollingLabel>Ask the team</RollingLabel><span aria-hidden="true">↗</span></Link>
        <a className="btn btn--white" href={DIRECTIONS} target="_blank" rel="noopener noreferrer"><RollingLabel>Get directions</RollingLabel><NewTab glued={false} /></a>
      </div></div>
    </div></header>

    <div className="contact-content">
    {/* The details people come for, first: email and phone (each copyable), and where to find us online. */}
    <section className="contact-quick" aria-labelledby="reach-us"><div className="container">
      <h2 id="reach-us" className="visually-hidden">Contact details</h2>
      <ul className="contact-quick__list">
        <li className="contact-quick__item">
          <span className="contact-quick__icon"><Icon name="email" /></span>
          <div><h3>Email</h3><p className="contact-quick__value"><a href={`mailto:${SITE.contactEmail}`}><EmailText address={SITE.contactEmail} /></a></p></div>
          <CopyButton text={SITE.contactEmail} label="Email address" />
        </li>
        <li className="contact-quick__item">
          <span className="contact-quick__icon"><Icon name="phone" /></span>
          <div><h3>Phone</h3><p className="contact-quick__value"><a href={PHONE.href}>{PHONE.text}</a></p><p className="contact-quick__note">Ask for Hult Prize at Fusion.</p></div>
          <CopyButton text={PHONE.text} label="Phone number" />
        </li>
        <li className="contact-quick__item contact-quick__item--online">
          <div><h3>Online</h3><ul className="contact-quick__links">{online.map(({ label, text, href, icon }) => <li key={label}><a href={href} target="_blank" rel="noopener noreferrer"><Icon name={icon} /><span><span className="visually-hidden">{label}: </span>{text}<NewTab /></span></a></li>)}</ul></div>
        </li>
      </ul>
    </div></section>

    {/* What do you need? Each kind of question with who handles it and the quickest way to ask. */}
    <section className="section contact-help" aria-labelledby="who-to-ask"><div className="container">
      <div className="contact-help__heading">
        <h2 id="who-to-ask" data-text-reveal><RevealText>How can we help?</RevealText></h2>
        <More to="/about#team">Meet the team</More>
      </div>
      <ul className="contact-routes">{routes.map(({ topic, text, form, links, members }) => <li key={topic} className="contact-route">
        <div className="contact-route__need"><h3>{topic}</h3><p>{text}</p></div>
        <div className="contact-route__who">
          {members.length > 0 ? <ul>{members.map(([name, role, email, portrait]) => <li key={email}>
            <Link className="contact-route__person" to={`?member=${portrait}`} state={{drawer:true}}><strong>{name}</strong><span className="visually-hidden">, {role}, view profile</span></Link>
            <a className="contact-route__email" href={`mailto:${email}`}><Icon name="email" /><span><EmailText address={email} /></span><span className="visually-hidden">, email {name}</span></a>
          </li>)}</ul> : <p className="contact-route__anyone">Anyone on the team can help.</p>}
        </div>
        <div className="contact-route__actions">
          <Link className="btn btn--secondary contact-route__ask" to={`?enquiry=${form}`} state={{drawer:true}}>Send a message<span className="visually-hidden"> about {topic.toLowerCase()}</span></Link>
          {links?.map(([to, label, external]) => external
            ? <a key={label} className="contact-route__link" href={to} target="_blank" rel="noopener noreferrer">{label}<NewTab /></a>
            : <span key={label} className="contact-route__link"><More to={to}>{label}</More></span>)}
        </div>
      </li>)}</ul>
    </div></section>

    <section className="section contact-place" aria-labelledby="come-and-find-us"><div className="container contact-place__grid">
      <div className="contact-place__info">
        <h2 id="come-and-find-us" data-text-reveal><RevealText>Visit Fusion</RevealText></h2>
        <p className="contact-place__welcome">{copy.contactIntro.join(' ')}</p>
        <dl className="contact-place__details">
          <div><dt>Address</dt><dd><address>Joyce Entrepreneurship Centre, 2nd{' '}Floor<br />2455 Wyandotte St.{' '}W., Windsor, ON N9B{' '}0C1</address></dd></div>
          <div><dt>Getting there</dt><dd>Southeast corner of Wyandotte Street West and Sunset Avenue.</dd></div>
          <div><dt>Hours</dt><dd>Monday to Friday, 9am to 4pm.</dd></div>
        </dl>
        <div className="contact-place__actions">
          <a className="btn btn--primary" href={DIRECTIONS} target="_blank" rel="noopener noreferrer"><RollingLabel>Get directions</RollingLabel><NewTab glued={false} /></a>
          <CopyButton text={ADDRESS} label="Address" named />
        </div>
        {fusion && <p className="contact-place__more">
          <More to={`/partners/${fusion.slug}`}>About Fusion</More>
          {fusion.url && <a href={fusion.url} target="_blank" rel="noopener noreferrer">Fusion’s website<NewTab /></a>}
        </p>}
      </div>
      <div className="contact-place__map">
        <iframe title="Google map of the Joyce Entrepreneurship Centre, 2455 Wyandotte St. W., Windsor, home of Fusion" src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
    </div></section>

    <CTABand text="Ready to enter?" lede="Check eligibility, find teammates and register your team."><Link className="btn btn--primary" to="/compete"><RollingLabel>How to compete</RollingLabel><span aria-hidden="true">→</span></Link></CTABand>
    </div>
  </div>
}
