import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import copy from '../data/copy.json'
import { DOWNLOADS, YEAR_ONE_PHOTOS, SHOW_EVENT_PHOTOS } from '../data/assets'
import CampusPhoto from '../components/CampusPhoto'
import TeamTree from '../components/TeamTree'
import YearOnePictureBook from '../components/YearOnePictureBook'
import { SITE } from '../data/site'
import SignupForm from '../components/SignupForm'
import { Copy, CTABand, PageHeader, RegisterButton, Section, Stats, Timeline } from '../components/PageParts'

const committee = [
  ['Mahnoz Akhtari', 'Campus Director', 'akhtari1@uwindsor.ca', 'mahnoz-akhtari'],
  ['Rachael Juru', 'Partnerships and Sponsorships Coordinator', 'juru@uwindsor.ca', 'rachael-juru'],
  ['Yusriyah Rahman', 'Judges, Experts and Course Integrations Lead', 'rahman4n@uwindsor.ca', 'yusriyah-rahman'],
  ['Sura Gaafar', 'Events and Outreach Lead', 'gaafar@uwindsor.ca', 'sura-gaafar'],
  ['Yumna Sumya', 'Marketing and Media Coordinator', 'sumya@uwindsor.ca', 'yumna-sumya'],
  ['Salma Syeda', 'Marketing and Media Coordinator', 'dev.salmacodes@gmail.com', 'salma-syeda'],
  ['Julia Adu-Bobie', 'Partnerships and Sponsorships Lead', 'adubobij@uwindsor.ca', 'julia-adu-bobie'],
]
export function AboutPage() {
  return <><PageHeader title="About" subtitle="A global competition, run here by students, for students." />
    <Section eyebrow="The competition" title="One million to change the world"><div className={SHOW_EVENT_PHOTOS ? "photo-copy-grid" : undefined}><Copy paragraphs={copy.aboutCompetition} /><CampusPhoto photo="applause" /></div></Section>
    <Section title="What we do at Windsor" tint="paper-blue"><Copy paragraphs={copy.aboutWindsor} />{DOWNLOADS.overview && <a className="text-link" href={DOWNLOADS.overview} download>Download the program overview</a>}</Section>
    <Section title="The people running it" id="team"><p className="prose">Hult Prize UWindsor is run by a committee of University of Windsor students, every one of them doing this alongside a full course load.</p><TeamTree groups={[
      { label: 'Campus Director', members: [committee[0]] },
      { label: 'Leads', members: [committee[2], committee[3], committee[6]] },
      { label: 'Coordinators', members: [committee[1], committee[4], committee[5]] },
    ]} /></Section>
  </>
}
export function YearOnePage() {
  return <><PageHeader title="Year one" subtitle="What happened the first time Windsor entered." />{SHOW_EVENT_PHOTOS && <div className="container"><CampusPhoto photo="room" priority className="campus-photo--wide" /></div>}<Section eyebrow="2025 to 2026" title="A first year worth building on"><Copy paragraphs={copy.yearOne} /><Stats items={[[ '14', 'startups registered'], ['6', 'at the Grand Finale'], ['Top 8', 'in Canada'], ['$8,000', 'raised from partners']]} /></Section>{YEAR_ONE_PHOTOS.length > 0 && <YearOnePictureBook />}</>
}
export function ThisYearPage() {
  return <><PageHeader title="This year" subtitle="2026 to 2027." /><Section title="What we are trying to do"><Copy paragraphs={copy.yearPlan} /></Section><Section title="Then and now" tint="paper-pink section-centred"><p>Year one → This year’s targets</p><Stats className="stat-band--compare" items={[[ '14 → 20', 'Startups registered'], ['6 → 10+', 'Teams at the Grand Finale'], ['$8K → $10K', 'Raised from partners\u00a0· minimum target'], ['4 → 6', 'Campus events']]} /></Section><Section title="The calendar"><Timeline /></Section><Section title="What teams get" tint="paper-blue"><Copy paragraphs={copy.yearBenefits} /></Section><CTABand /></>
}
// Compete follows hultprize.org/how-it-works: full-bleed photo and navy split bands, centred short
// headings, white cards on a tinted ground, numbered steps and a centred FAQ. The copy is unchanged;
// where a first sentence is set as a heading, the rest follows it word for word.
// Splits after ". ", "? " or "! " without regex lookbehind, which older Safari cannot parse.
const sentences = (text: string) => text.replace(/([.?!])\s+/g, '$1\n').split('\n')
// Each step reads "N. First sentence. The rest."; the first sentence becomes the card heading.
function splitStep(step: string) {
  const [heading, ...rest] = sentences(step.replace(/^\d+\.\s*/, ''))
  return [heading, rest.join(' ')]
}
// Small labels over the eligibility cards, matched on each rule's wording so an edited or reordered
// list never puts a label on the wrong rule. A rule with no match simply has no label.
const eligibilityLabels: [RegExp, string][] = [[/two to four/i, 'Team size'], [/must be a student/i, 'Enrolment'], [/18 or older/i, 'Age'], [/University of Windsor/i, 'UWindsor'], [/per person/i, 'Limit'], [/venture/i, 'Venture']]
const labelFor = (rule: string) => eligibilityLabels.find(([pattern]) => pattern.test(rule))?.[1]
// The rule most people get wrong (see competeIntro), found by its wording rather than its position.
const isKeyRule = (rule: string) => /University of Windsor/i.test(rule)
const isOfficialStep = (step: string) => step.includes('hultprize.org/register')
// Lets "hultprize.org/register." wrap after the slash on narrow phones and at large text sizes.
const breakAfterSlash = (text: string) => text.split('/').map((part, i, parts) => i < parts.length - 1 ? <Fragment key={i}>{part}/<wbr /></Fragment> : part)
// Each step's action, matched on its wording. The arrows are glued to the last word so they never wrap alone.
function stepAction(step: string) {
  if (/sign up below/i.test(step)) return <Link className="journey-step__link" to="#signup">{'Get on the list\u00a0→'}</Link>
  if (isOfficialStep(step)) return <RegisterButton />
  if (/group chat/i.test(step)) return <a className="journey-step__link" href={SITE.signalRegisteredUrl} target="_blank" rel="noopener noreferrer">{'Join the registered teams chat\u00a0↗'}</a>
  return null
}
// Full-bleed photo beside a navy panel, as on hultprize.org/how-it-works. Without photos the panel
// sets the heading beside the copy so the band still fills the column.
function SplitBand({ photo, reverse = false, labelId, head, children }: { photo: 'stage' | 'teamwork'; reverse?: boolean; labelId: string; head: ReactNode; children: ReactNode }) {
  return <section className={`compete-split compete-split--${photo}${reverse ? ' compete-split--reverse' : ''}${SHOW_EVENT_PHOTOS ? '' : ' compete-split--solo'}`} aria-labelledby={labelId}>
    <CampusPhoto photo={photo} /><div className="compete-split__panel"><div>{head}</div><div>{children}</div></div>
  </section>
}
// A Compete section with its heading; the classes set its ground and whether the heading is centred.
function Band({ labelId, title, className, children }: { labelId: string; title: string; className: string; children: ReactNode }) {
  return <section className={`section chapter-section compete-band ${className}`} aria-labelledby={labelId}><div className="container"><h2 id={labelId}>{title}</h2>{children}</div></section>
}
export function CompetePage() {
  const [introLead, ...introRest] = copy.competeIntro
  return <><PageHeader title="Compete" subtitle="An idea, two to four people, four minutes." />
    {/* On phones the header's Register sits behind Menu, so both actions go on the first screen. */}
    <div className="container compete-actions"><RegisterButton /><Link className="btn btn--secondary" to="#signup">Get on the list</Link></div>
    <SplitBand photo="stage" labelId="start-here" head={<h2 id="start-here">You can start here</h2>}>
      <p className="compete-lead">{introLead}</p>
      {introRest.map(paragraph => { const [title, ...rest] = sentences(paragraph); return <p key={paragraph} className="compete-note"><strong>{title}</strong> {rest.join(' ')}</p> })}
    </SplitBand>
    <Band labelId="who-can-enter" title="Who can enter" className="paper-blue section-centred"><ul className="eligibility-grid">{copy.eligibility.map(rule => {
      const label = labelFor(rule)
      const [lead, ...rest] = sentences(rule)
      return <li key={rule} className={`eligibility-card${isKeyRule(rule) ? ' eligibility-card--key' : ''}`}>
        {label && <span className="eligibility-card__label">{label}</span>}
        <p>{isKeyRule(rule) ? <><strong>{lead}</strong> {rest.join(' ')}</> : rule}</p>
      </li>
    })}</ul></Band>
    <Band labelId="how-to-enter" title="How to enter" className="section-centred"><ol className="journey">{copy.steps.map((step, i) => {
      const [heading, body] = splitStep(step)
      return <li key={step} className={`journey-step${isOfficialStep(step) ? ' journey-step--official' : ''}`}>
        <span className="journey-step__number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <h3>{breakAfterSlash(heading)}</h3>{body && <p>{body}</p>}{stepAction(step)}
      </li>
    })}</ol></Band>
    <section className="section chapter-section paper-pink" id="signup" aria-labelledby="signup-title"><div className="container signup-layout">
      <div><h2 id="signup-title">Get on the list</h2><p className="prose">Tell us who you are and we will keep you posted on deadlines, workshops and team matching.</p></div>
      <div className="compete-form"><SignupForm /></div>
    </div></section>
    <SplitBand photo="teamwork" reverse labelId="no-team" head={<><p className="eyebrow">No team yet</p><h2 id="no-team">Most people start this way.</h2></>}><Copy paragraphs={copy.noTeam} /><a className="btn btn--secondary" href={SITE.signalLookingUrl} target="_blank" rel="noopener noreferrer">{'Join the mixer chat\u00a0↗'}</a></SplitBand>
    <Band labelId="questions" title="Questions" className="section-centred"><div className="faq">{copy.faq.map(item => { const [q, ...answer] = item.split('?'); return <details key={q}><summary><span>{q}?</span><span className="faq__icon" aria-hidden="true" /></summary><p>{answer.join('?').trim()}</p></details> })}</div></Band>
    <CTABand />
  </>
}
// Each tier reads "Name, amount.  What it includes." The first card of a lead set is highlighted.
function TierCards({ tiers, lead = false }: { tiers: string[]; lead?: boolean }) {
  return <div className="tier-list">{tiers.map((text, i) => {
    const [heading, ...rest] = text.split('.  ')
    const [name, amount] = heading.split(', ')
    return <article className={`tier-card ${lead && i === 0 ? 'tier-card--lead' : ''}`} key={name}><div><h3>{name}</h3><p className="tier-amount">{amount}</p></div><div><p>{rest.join('.  ')}</p><p className="tier-report">{copy.tierReport}</p></div></article>
  })}</div>
}
export function PartnersPage() {
  const [emailUser, emailDomain] = SITE.contactEmail.split('@')
  return <><PageHeader title="Partners" subtitle="What support pays for, and how to offer it." />
    <Section title="Last year and this year" tint="paper-pink"><Copy paragraphs={copy.partnersYear} /></Section>
    <Section title="What you get"><CampusPhoto photo="room" className="campus-photo--wide" /><div className="benefit-grid">{copy.partnersBenefits.map(([heading, text]) => <div key={heading}><h3>{heading}</h3><p>{text}</p></div>)}</div></Section>
    <Section title="Where the ventures are now" tint="paper-blue"><Copy paragraphs={copy.partnersVentures} /></Section>
    <Section title="Where the money goes"><Copy paragraphs={copy.funding} /><Stats items={[['$8,000', 'raised last year'], ['$10,000', 'needed to run this year'], ['$3,500', 'in prizes, sponsored separately']]} /></Section>
    <Section title="Named packages"><TierCards tiers={copy.namedPackages} lead /><h2 className="tier-heading">Other tiers</h2><TierCards tiers={copy.otherTiers} /><p className="tier-note">{copy.tierNote}</p></Section>
    <Section title="Ways to help without money"><Copy paragraphs={copy.otherSupport} /></Section>
    <CTABand text={copy.partnersContact} className="cta-band--contact"><div className="cta-band__actions"><a className="btn btn--dark" href={`mailto:${SITE.contactEmail}`} aria-label={SITE.contactEmail}>{emailUser}<wbr />@{emailDomain}</a>{DOWNLOADS.partnershipProposal && <a className="cta-band__link" href={DOWNLOADS.partnershipProposal} download>Download the full partnership proposal</a>}</div></CTABand>
  </>
}
export function ContactPage() {
  return <><PageHeader title="Find us" subtitle="We have a home, and the door is open." /><Section title="Inside Fusion"><Copy paragraphs={copy.contactIntro} /></Section><Section title="Come and find us" tint="paper-blue"><div className="contact-grid"><div><address><strong>Fusion</strong><br />Joyce Entrepreneurship Centre, 2nd Floor<br />2455 Wyandotte St. W.<br />Windsor, ON N9B 0C1</address><p>Southeast corner of Wyandotte Street West and Sunset Avenue.</p><p><strong>Open Monday to Friday, 9am to 4pm.</strong></p><p><a href="tel:+15192533000;ext=3515">519 253 3000, extension 3515.</a> Say you are asking about the Hult Prize initiative in the Fusion space.</p></div><iframe title="Joyce Entrepreneurship Centre map" src="https://maps.google.com/maps?q=Joyce%20Entrepreneurship%20Centre%202455%20Wyandotte%20St%20W%20Windsor&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></Section><Section title="Reach us"><dl className="contact-links">{[['Email', SITE.contactEmail, `mailto:${SITE.contactEmail}`], ['Phone', '519 253 3000, extension 3515', 'tel:+15192533000;ext=3515'], ['Instagram', SITE.instagramHandle, SITE.instagramUrl], ['LinkedIn', 'Hult Prize at the University of Windsor', SITE.linkedinUrl], ['Web', 'hultprizeuwindsor.ca', SITE.websiteUrl]].map(([label, text, href]) => <div key={label}><dt>{label}</dt><dd><a href={href} target={href.startsWith('https') ? '_blank' : undefined} rel="noopener noreferrer">{text}</a></dd></div>)}</dl></Section></>
}
