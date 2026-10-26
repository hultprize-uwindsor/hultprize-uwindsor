import { RevealText, RollingLabel } from '../components/MotionText'
import { type ReactNode } from 'react'
import { Link } from '../components/PageLink'
import copy from '../data/copy.json'
import { DOWNLOADS, HOME_BOARD_PHOTOS, YEAR_ONE_PHOTOS } from '../data/assets'
import CampusPhoto from '../components/CampusPhoto'
import { TeamGallery, SeasonGallery, PartnerGallery } from '../components/PeopleGallery'
import { AboutIntro, AboutOffers, CompetitionRoad, GetInvolved } from '../components/AboutSections'
import SeasonMilestones from '../components/SeasonMilestones'
import SeasonPlanner from '../components/SeasonPlanner'
import { DeadlineCountdown, EntryChecklist, EntryRoute, PrizePodium } from '../components/CompeteSections'
import { LaunchStrip, SeasonChecklist, SeasonGoals } from '../components/ThisYearSections'
import { SITE } from '../data/site'
import SignupForm from '../components/SignupForm'
import { Copy, PageHeader, PageLayout, RegisterButton, Section, Stats } from '../components/PageParts'

export function AboutPage() {
  return <PageLayout title="About" subtitle="The global student startup competition at UWindsor.">
    <Section tint="about-intro-section"><AboutIntro /></Section>
    <Section title="One million to change the world" tint="paper-blue"><Copy paragraphs={copy.aboutCompetition} /><CompetitionRoad /></Section>
    <Section title="What we do at Windsor"><AboutOffers />{DOWNLOADS.overview && <a className="text-link" href={DOWNLOADS.overview} download>Download the program overview</a>}</Section>
    <Section title="The Team" id="team"><p className="prose">Meet the UWindsor students running the competition.</p><TeamGallery /></Section>
    <Section title="Get involved" tint="paper-pink"><GetInvolved /></Section>
  </PageLayout>
}
export function YearOnePage() {
  return <PageLayout title="Year one" subtitle="2025-2026: Windsor’s first Hult Prize season."><Section title="Where we started"><p className="prose">Windsor’s first Hult Prize season, stage by stage.</p><SeasonMilestones /></Section>{YEAR_ONE_PHOTOS.length > 0 && <SeasonGallery />}<Section><div className="page-next"><div><h2 data-text-reveal><RevealText>See what’s next</RevealText></h2><p>The 2026-2027 season: workshops, team support and the road to Calgary.</p></div><Link className="btn btn--secondary" to="/this-year"><RollingLabel>This year’s program</RollingLabel><span aria-hidden="true">→</span></Link></div></Section></PageLayout>
}
export function ThisYearPage() {
  return <PageLayout title="This year" subtitle="2026-2027 goals, dates and team support.">
    <Section tint="goal-board-section" id="goals"><SeasonGoals /></Section>
    <Section title="This year so far" tint="paper-pink"><LaunchStrip /></Section>
    <Section title="The calendar" id="calendar"><SeasonPlanner /></Section>
    <Section title="Your season checklist" tint="paper-blue"><SeasonChecklist /></Section>
  </PageLayout>
}
// Compete follows hultprize.org/how-it-works: full-bleed photo and navy split bands, centred short headings, an
// entry checklist, the prizes (a podium, a boarding pass and a cheque), the steps as one route and a centred FAQ. The
// copy is unchanged; where a first sentence is set as a heading, the rest follows it word for word.
// Splits after ". ", "? " or "! " without regex lookbehind, which older Safari cannot parse.
const sentences = (text: string) => text.replace(/([.?!])\s+/g, '$1\n').split('\n')
// Full-bleed photo beside a navy panel, as on hultprize.org/how-it-works. The photos are approved board photos
// (1440px copies); without them the panel sets the heading beside the copy so the band still fills the column.
function SplitBand({ photo, reverse = false, labelId, head, children }: { photo: { name: string; alt: string }; reverse?: boolean; labelId: string; head: ReactNode; children: ReactNode }) {
  const approved = HOME_BOARD_PHOTOS.some(item => item.name === photo.name)
  return <section className={`compete-split${reverse ? ' compete-split--reverse' : ''}${approved ? '' : ' compete-split--solo'}`} aria-labelledby={labelId}>
    {approved && <figure className="campus-photo"><img src={`/images/board/${photo.name}-720.webp`} srcSet={`/images/board/${photo.name}-720.webp 720w, /images/board/${photo.name}-1440.webp 1440w`} sizes="(max-width: 1100px) 100vw, 50vw" width={1440} height={1152} alt={photo.alt} loading="lazy" decoding="async" /></figure>}
    <div className="compete-split__panel"><div>{head}</div><div>{children}</div></div>
  </section>
}
// A Compete section with its heading; the classes set its ground and whether the heading is centred.
function Band({ labelId, title, className, children }: { labelId: string; title: string; className: string; children: ReactNode }) {
  return <section className={`section chapter-section compete-band ${className}`} aria-labelledby={labelId}><div className="container"><h2 id={labelId} data-text-reveal><RevealText>{title}</RevealText></h2>{children}</div></section>
}
export function CompetePage() {
  const [introLead, ...introRest] = copy.competeIntro
  return <div className="compete-page"><PageHeader title="Compete" subtitle="2-4 students. A business idea. A 4-minute pitch." />
    <div className="compete-content">
    {/* Keep competition entry and program updates together on the first screen. */}
    <div className="container compete-actions"><RegisterButton /><Link className="btn btn--secondary" to="#signup"><RollingLabel>Get on the list</RollingLabel></Link><DeadlineCountdown /></div>
    <SplitBand photo={{ name: 'team-pitch', alt: 'Two students presenting a flood-response idea, with one speaking and the other holding a model' }} labelId="start-here" head={<h2 id="start-here" data-text-reveal><RevealText>You can start here</RevealText></h2>}>
      <p className="compete-lead">{introLead}</p>
      {introRest.map(paragraph => { const [title, ...rest] = sentences(paragraph); return <p key={paragraph} className="compete-note"><strong>{title}</strong> {rest.join(' ')}</p> })}
    </SplitBand>
    <Band labelId="who-can-enter" title="Who can enter" className="paper-blue section-centred"><EntryChecklist rules={copy.eligibility} /></Band>
    <Band labelId="prizes" title="What’s at stake" className="paper-pink section-centred"><PrizePodium /></Band>
    <Band labelId="how-to-enter" title="How to enter" className="section-centred"><EntryRoute steps={copy.steps} /></Band>
    <section className="section chapter-section paper-pink" id="signup" aria-labelledby="signup-title"><div className="container signup-layout">
      <div><h2 id="signup-title" data-text-reveal><RevealText>Get on the list</RevealText></h2><p className="prose">Get updates on deadlines, workshops and team matching.</p></div>
      <div className="compete-form"><SignupForm /></div>
    </div></section>
    <SplitBand photo={{ name: 'year-one-0686', alt: 'Four students in black T-shirts strike a playful pose together onstage' }} reverse labelId="no-team" head={<><h2 id="no-team" data-text-reveal><RevealText>Find your teammates.</RevealText></h2></>}><Copy paragraphs={copy.noTeam} /><a className="btn btn--secondary" href={SITE.discordUrl} target="_blank" rel="noopener noreferrer"><RollingLabel>Join our Discord</RollingLabel><span aria-hidden="true">↗</span></a></SplitBand>
    <Band labelId="questions" title="Questions" className="section-centred"><div className="faq">{copy.faq.map(item => { const [q, ...answer] = item.split('?'); return <details key={q}><summary><span>{q}?</span><span className="faq__icon" aria-hidden="true" /></summary><p>{answer.join('?').trim()}</p></details> })}</div></Band>

    </div>
  </div>
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
  return <PageLayout title="Partners" subtitle="Fund the program. Sponsor a prize. Mentor a team."><nav className="container section-links" aria-label="Partnership options"><Link to="#packages">View packages ↓</Link><Link to="/contact#who-to-ask">Talk to the partnerships team →</Link></nav>
    <Section title="The people behind the programme"><p className="section-intro">Space, expertise and support for student founders.</p><PartnerGallery /></Section><Section title="Last year and this year" tint="paper-pink editorial-section"><Copy paragraphs={copy.partnersYear} /></Section>
    <Section title="What you get"><CampusPhoto photo="room" className="campus-photo--wide" /><div className="benefit-grid">{copy.partnersBenefits.map(([heading, text]) => <div key={heading}><h3>{heading}</h3><p>{text}</p></div>)}</div></Section>
    <Section title="Where the ventures are now" tint="paper-blue editorial-section"><Copy paragraphs={copy.partnersVentures} /></Section>
    <Section title="Where the money goes" tint="editorial-section"><Copy paragraphs={copy.funding} /><Stats items={[['$8,000', 'raised last year'], ['$10,000', 'needed to run this year'], ['$3,500', 'in prizes, sponsored separately']]} /></Section>
    <Section title="Sponsorship packages" id="packages"><TierCards tiers={copy.namedPackages} lead /><h2 className="tier-heading" data-text-reveal><RevealText>Other tiers</RevealText></h2><TierCards tiers={copy.otherTiers} /><p className="tier-note">{copy.tierNote}</p></Section>
    <Section title="Share your time or expertise" tint="editorial-section"><Copy paragraphs={copy.otherSupport} /></Section>
    <Section><div className="page-next"><div><h2 data-text-reveal><RevealText>Let’s work together.</RevealText></h2><p>Choose a package or tell us how you’d like to help.</p></div><div className="page-next__actions"><Link className="btn btn--primary" to="?enquiry=partnership" state={{drawer:true}}><RollingLabel>Start a conversation</RollingLabel><span aria-hidden="true">↗</span></Link><a href={`mailto:${SITE.contactEmail}`} aria-label={SITE.contactEmail}>{emailUser}<wbr />@{emailDomain}</a>{DOWNLOADS.partnershipProposal && <a href={DOWNLOADS.partnershipProposal} download>Download the partnership proposal</a>}</div></div></Section>
  </PageLayout>
}
