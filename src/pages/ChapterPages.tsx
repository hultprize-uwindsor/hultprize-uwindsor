import { RevealText, RollingLabel } from '../components/MotionText'
import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import copy from '../data/copy.json'
import { DOWNLOADS, YEAR_ONE_PHOTOS, SHOW_EVENT_PHOTOS } from '../data/assets'
import CampusPhoto from '../components/CampusPhoto'
import { TeamGallery, SeasonGallery, PartnerGallery } from '../components/PeopleGallery'
import { SITE } from '../data/site'
import SignupForm from '../components/SignupForm'
import { Copy, PageHeader, RegisterButton, Section, Stats, Timeline } from '../components/PageParts'

export function AboutPage() {
  return <><PageHeader title="About" subtitle="The global student startup competition at UWindsor." />
    <Section eyebrow="The competition" title="One million to change the world" tint="editorial-section"><div className={SHOW_EVENT_PHOTOS ? "photo-copy-grid" : undefined}><Copy paragraphs={copy.aboutCompetition} /><CampusPhoto photo="applause" /></div></Section>
    <Section title="What we do at Windsor" tint="paper-blue editorial-section"><Copy paragraphs={copy.aboutWindsor} />{DOWNLOADS.overview && <a className="text-link" href={DOWNLOADS.overview} download>Download the program overview</a>}</Section>
    <Section title="The Team" id="team"><p className="prose">Meet the UWindsor students running the competition.</p><TeamGallery /></Section>
  </>
}
export function YearOnePage() {
  return <><PageHeader title="Year one" subtitle="2025–2026: Windsor’s first Hult Prize season." />{SHOW_EVENT_PHOTOS && <div className="container"><CampusPhoto photo="room" priority className="campus-photo--wide" /></div>}<Section eyebrow="2025 to 2026" title="Where we started" tint="editorial-section year-story"><Copy paragraphs={copy.yearOne} /><Stats items={[[ '14', 'startups registered'], ['6', 'at the Grand Finale'], ['Top 8', 'in Canada'], ['$8,000', 'raised from partners']]} /></Section>{YEAR_ONE_PHOTOS.length > 0 && <SeasonGallery />}<Section><div className="page-next"><div><p className="eyebrow">2026 to 2027</p><h2 data-text-reveal><RevealText>See what’s next</RevealText></h2><p>Workshops, team support and the road to Calgary.</p></div><Link className="btn btn--secondary" to="/this-year"><RollingLabel>This year’s program</RollingLabel><span aria-hidden="true">→</span></Link></div></Section></>
}
export function ThisYearPage() {
  return <><PageHeader title="This year" subtitle="2026–2027 goals, dates and team support." /><Section title="Our goals" tint="editorial-section"><Copy paragraphs={copy.yearPlan} /></Section><Section title="Then and now" tint="paper-pink section-centred"><p>Year one → This year’s targets</p><Stats className="stat-band--compare" items={[[ '14 → 20', 'Startups registered'], ['6 → 10+', 'Teams at the Grand Finale'], ['$8K → $10K', 'Raised from partners\u00a0· minimum target'], ['4 → 6', 'Campus events']]} /></Section><Section title="The calendar" id="calendar"><Timeline /></Section><Section title="What teams get" tint="paper-blue"><p className="section-intro">{copy.yearBenefits[0]}</p><div className="benefit-grid team-benefits">{[["Learn and practise", "Five workshops from November 7 to January 9 cover business models, pitch decks and delivery. Teams have a touch base on January 2."], ["Find your team and mentor", "Get help finding teammates and a mentor matched to your team. Pitch to Windsor business leaders at the Grand Finale on February 5."], ["Prepare for Nationals", "The Uwill Discover Conference is on March 13. Up to three teams can represent UWindsor at Nationals in Calgary on April 10–11, with nine weeks to prepare after the Grand Finale. The program ends April 11, 2027."]].map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></Section></>
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
  return <section className={`section chapter-section compete-band ${className}`} aria-labelledby={labelId}><div className="container"><h2 id={labelId} data-text-reveal><RevealText>{title}</RevealText></h2>{children}</div></section>
}
export function CompetePage() {
  const [introLead, ...introRest] = copy.competeIntro
  return <><PageHeader title="Compete" subtitle="2–4 students. A business idea. A 4-minute pitch." />
    {/* Keep competition entry and program updates together on the first screen. */}
    <div className="container compete-actions"><RegisterButton /><Link className="btn btn--secondary" to="#signup"><RollingLabel>Get on the list</RollingLabel></Link></div>
    <SplitBand photo="stage" labelId="start-here" head={<h2 id="start-here" data-text-reveal><RevealText>You can start here</RevealText></h2>}>
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
      <div><h2 id="signup-title" data-text-reveal><RevealText>Get on the list</RevealText></h2><p className="prose">Get updates on deadlines, workshops and team matching.</p></div>
      <div className="compete-form"><SignupForm /></div>
    </div></section>
    <SplitBand photo="teamwork" reverse labelId="no-team" head={<><p className="eyebrow">No team yet</p><h2 id="no-team" data-text-reveal><RevealText>Find your teammates.</RevealText></h2></>}><Copy paragraphs={copy.noTeam} /><a className="btn btn--secondary" href={SITE.signalLookingUrl} target="_blank" rel="noopener noreferrer"><RollingLabel>Join the team matching chat</RollingLabel><span aria-hidden="true">↗</span></a></SplitBand>
    <Band labelId="questions" title="Questions" className="section-centred"><div className="faq">{copy.faq.map(item => { const [q, ...answer] = item.split('?'); return <details key={q}><summary><span>{q}?</span><span className="faq__icon" aria-hidden="true" /></summary><p>{answer.join('?').trim()}</p></details> })}</div></Band>

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
  return <><PageHeader title="Partners" subtitle="Fund the program. Sponsor a prize. Mentor a team." /><nav className="container section-links" aria-label="Partnership options"><Link to="#packages">View packages ↓</Link><Link to="/contact#who-to-ask">Talk to the partnerships team →</Link></nav>
    <Section title="The people behind the programme"><p className="section-intro">Space, expertise and support for student founders.</p><PartnerGallery /></Section><Section title="Last year and this year" tint="paper-pink editorial-section"><Copy paragraphs={copy.partnersYear} /></Section>
    <Section title="What you get"><CampusPhoto photo="room" className="campus-photo--wide" /><div className="benefit-grid">{copy.partnersBenefits.map(([heading, text]) => <div key={heading}><h3>{heading}</h3><p>{text}</p></div>)}</div></Section>
    <Section title="Where the ventures are now" tint="paper-blue editorial-section"><Copy paragraphs={copy.partnersVentures} /></Section>
    <Section title="Where the money goes" tint="editorial-section"><Copy paragraphs={copy.funding} /><Stats items={[['$8,000', 'raised last year'], ['$10,000', 'needed to run this year'], ['$1,750', 'in prizes, sponsored separately']]} /></Section>
    <Section title="Sponsorship packages" id="packages"><TierCards tiers={copy.namedPackages} lead /><h2 className="tier-heading" data-text-reveal><RevealText>Other tiers</RevealText></h2><TierCards tiers={copy.otherTiers} /><p className="tier-note">{copy.tierNote}</p></Section>
    <Section title="Share your time or expertise" tint="editorial-section"><Copy paragraphs={copy.otherSupport} /></Section>
    <Section><div className="page-next"><div><h2 data-text-reveal><RevealText>Let’s work together.</RevealText></h2><p>Choose a package or tell us how you’d like to help.</p></div><div className="page-next__actions"><Link className="btn btn--primary" to="?enquiry=partnership" state={{drawer:true}}><RollingLabel>Start a conversation</RollingLabel><span aria-hidden="true">↗</span></Link><a href={`mailto:${SITE.contactEmail}`} aria-label={SITE.contactEmail}>{emailUser}<wbr />@{emailDomain}</a>{DOWNLOADS.partnershipProposal && <a href={DOWNLOADS.partnershipProposal} download>Download the partnership proposal</a>}</div></div></Section>
  </>
}
