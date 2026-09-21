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
  ['Salma Sayeda', 'Marketing and Media Coordinator', 'dev.salmacodes@gmail.com', 'salma-syeda'],
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
  return <><PageHeader title="This year" subtitle="2026 to 2027." /><Section title="What we are trying to do"><Copy paragraphs={copy.yearPlan} /></Section><Section title="Then and now" tint="paper-pink"><p>Year one → This year’s targets</p><Stats items={[[ '14 → 20', 'Startups registered'], ['6 → 10+', 'Teams at the Grand Finale'], ['$8,000 → $10,000', 'Raised from partners · minimum target'], ['4 → 6', 'Campus events']]} /></Section><Section title="The calendar"><Timeline /></Section><Section title="What teams get" tint="paper-blue"><Copy paragraphs={copy.yearBenefits} /></Section><CTABand /></>
}
export function CompetePage() {
  return <><PageHeader title="Compete" subtitle="An idea, two to four people, four minutes." /><Section title="You can start here"><div className={SHOW_EVENT_PHOTOS ? "photo-copy-grid" : undefined}><Copy paragraphs={copy.competeIntro} /><CampusPhoto photo="pitch" /></div></Section>
    <Section title="Who can enter" tint="paper-blue"><div className="callout"><ul>{copy.eligibility.map((line, i) => <li key={line}>{i === 3 ? <strong>{line}</strong> : line}</li>)}</ul></div></Section>
    <Section title="How to enter"><ol className="entry-steps">{copy.steps.map((step, i) => <li key={step} className={i === 1 ? 'official-step' : ''}><span>{step.slice(3)}</span>{i === 0 && <Link to="#signup">Get on the list →</Link>}{i === 1 && <RegisterButton />}{i === 3 && <a href={SITE.signalRegisteredUrl} target="_blank" rel="noopener noreferrer">Join the registered teams chat ↗</a>}</li>)}</ol></Section>
    <Section title="Get on the list" tint="paper-pink" id="signup"><p className="prose">Tell us who you are and we will keep you posted on deadlines, workshops and team matching. Takes about thirty seconds.</p><div className="form-wrap"><SignupForm /></div></Section>
    <Section eyebrow="No team yet" title="Most people start this way."><div className="callout"><Copy paragraphs={copy.noTeam} /><a className="btn btn--secondary" href={SITE.signalLookingUrl} target="_blank" rel="noopener noreferrer">Join the mixer chat ↗</a></div></Section>
    <Section title="Questions" tint="paper-blue"><div className="faq">{copy.faq.map(item => { const [q, ...answer] = item.split('?'); return <details key={q}><summary>{q}?</summary><p>{answer.join('?').trim()}</p></details> })}</div></Section><CTABand />
  </>
}
export function PartnersPage() {
  return <><PageHeader title="Partners" subtitle="What support pays for, and how to offer it." /><Section title="Why we ask"><div className={SHOW_EVENT_PHOTOS ? "photo-copy-grid" : undefined}><Copy paragraphs={copy.partnersIntro} /><CampusPhoto photo="community" /></div></Section><Section title="Where the money goes" tint="paper-blue"><Copy paragraphs={copy.funding} /><CampusPhoto photo="room" className="campus-photo--wide" /><Stats items={[[ '$8,000', 'raised in year one'], ['$10,000', 'this year’s minimum'], ['0', 'spent on prize money']]} /></Section><Section title="A way to back every ambition" eyebrow="Partnership tiers"><div className="tier-list">{copy.tiers.map((text, i) => { const [heading, ...rest] = text.split('.  '); return <article className="tier-card" key={heading}><span className="tier-index">0{i + 1}</span><h3>{heading}</h3><p>{rest.join('.  ')}</p></article> })}</div></Section><Section title="Other ways to help" tint="paper-pink"><Copy paragraphs={copy.otherSupport} /></Section><Section title="Talk to us"><p className="prose">Every tier can be adapted. Tell us what your organisation cares about and we will build around it.</p><a className="btn btn--secondary email-cta" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>{DOWNLOADS.partnershipProposal && <p><a className="text-link" href={DOWNLOADS.partnershipProposal} download>Download the full partnership proposal</a></p>}</Section></>
}
export function ContactPage() {
  return <><PageHeader title="Find us" subtitle="We have a home, and the door is open." /><Section title="Inside Fusion"><Copy paragraphs={copy.contactIntro} /></Section><Section title="Come and find us" tint="paper-blue"><div className="contact-grid"><div><address><strong>Fusion</strong><br />Joyce Entrepreneurship Centre, 2nd Floor<br />2455 Wyandotte St. W.<br />Windsor, ON N9B 0C1</address><p>Southeast corner of Wyandotte Street West and Sunset Avenue.</p><p><strong>Open Monday to Friday, 9am to 4pm.</strong></p><p><a href="tel:+15192533000;ext=3515">519 253 3000, extension 3515.</a> Say you are asking about the Hult Prize initiative in the Fusion space.</p></div><iframe title="Joyce Entrepreneurship Centre map" src="https://maps.google.com/maps?q=Joyce%20Entrepreneurship%20Centre%202455%20Wyandotte%20St%20W%20Windsor&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></Section><Section title="Reach us"><dl className="contact-links">{[['Email', SITE.contactEmail, `mailto:${SITE.contactEmail}`], ['Phone', '519 253 3000, extension 3515', 'tel:+15192533000;ext=3515'], ['Instagram', SITE.instagramHandle, SITE.instagramUrl], ['LinkedIn', 'Hult Prize at the University of Windsor', SITE.linkedinUrl], ['Web', 'hultprizeuwindsor.ca', SITE.websiteUrl]].map(([label, text, href]) => <div key={label}><dt>{label}</dt><dd><a href={href} target={href.startsWith('https') ? '_blank' : undefined} rel="noopener noreferrer">{text}</a></dd></div>)}</dl></Section></>
}
