import { Fragment, useState } from 'react'
import { Link } from './PageLink'
import { RegisterButton } from './PageParts'
import { SITE } from '../data/site'
import { localDay } from '../lib/attendance'
import './CompeteSections.css'

/** How long is left to register, counted in Windsor days. */
export function DeadlineCountdown() {
  const [now] = useState(() => Date.now())
  const days = Math.round((Date.parse(SITE.registrationClosesOn) - Date.parse(localDay(now))) / 86_400_000)
  const left = days > 1 ? `${days} days to go` : days === 1 ? 'Last day tomorrow' : days === 0 ? 'Closes today' : null
  return <p className={`deadline-chip${left ? '' : ' is-closed'}`}>
    <span className="deadline-chip__date" aria-hidden="true"><span>Nov</span><strong>20</strong></span>
    <span>{left ? <>Registration closes {SITE.registrationCloses} · <strong>{left}</strong></> : `Registration closed ${SITE.registrationCloses}`}</span>
  </p>
}

// The campus prizes, in Canadian dollars: first, second and third at the Campus Grand Finale.
const CAMPUS_PRIZES = [
  { place: '1st', prize: '$2,000', tone: 'gold' },
  { place: '2nd', prize: '$1,000', tone: 'silver' },
  { place: '3rd', prize: '$500', tone: 'bronze' },
]

/** What's at stake, in the order a team meets it: award rosettes for the campus prizes (gold in the middle), then a
    boarding pass to Nationals in Calgary and an oversized cheque for the global prize, each under a handwritten
    caption. The pass and cheque say only what the site says elsewhere; the cheque names no bank and carries no
    signature. */
export function PrizePodium() {
  return <div className="prize-stakes">
    <p className="prize-stage" aria-hidden="true">Win in Windsor</p>
    <ol className="prize-rosettes" aria-label="Campus Grand Finale cash prizes">{CAMPUS_PRIZES.map(prize => <li key={prize.place} className={`rosette rosette--${prize.tone}`}>
      <span className="rosette__badge">
        <span className="rosette__place">{prize.place}<span className="visually-hidden"> place:</span></span>
        <strong className="rosette__prize">{prize.prize}</strong>
      </span>
      <span className="rosette__tails" aria-hidden="true" />
    </li>)}</ol>
    <p className="prize-stakes__note">Cash prizes for the top three teams at the Campus Grand Finale, in Canadian dollars.</p>
    <ul className="prize-beyond">
      <li>
        <p className="prize-stage" aria-hidden="true">Fly to Calgary</p>
        <div className="prize-pass">
          <div className="prize-pass__main">
            <p className="prize-pass__band" aria-hidden="true"><span>Boarding pass</span><span>✈</span></p>
            <h3>Nationals in Calgary</h3>
            <p className="prize-pass__route"><span><strong>YQG</strong> Windsor</span><span className="prize-pass__arc" aria-hidden="true" /><span><strong>YYC</strong> Calgary</span></p>
            <dl className="prize-pass__fields">
              <div><dt>Passengers</dt><dd>Up to 3 UWindsor teams</dd></div>
              <div><dt>Dates</dt><dd>April 10-11</dd></div>
            </dl>
            <p className="prize-pass__note">The winning team’s travel is covered.</p>
          </div>
          <div className="prize-pass__stub" aria-hidden="true"><strong>YYC</strong><span>Apr 10-11</span><span className="prize-pass__barcode" /></div>
        </div>
      </li>
      <li>
        <p className="prize-stage" aria-hidden="true">Go for US$1 million</p>
        <div className="prize-cheque">
          <h3>Global prize</h3>
          <p className="prize-cheque__line prize-cheque__payee"><span>Pay to the order of</span> <span className="prize-cheque__fill">the global winner</span></p>
          <p className="prize-cheque__amount"><span className="visually-hidden">Amount: </span>US$1,000,000</p>
          <p className="prize-cheque__line"><span className="prize-cheque__fill">One million US dollars</span></p>
          <p className="prize-cheque__line prize-cheque__memo"><span>Memo</span> <span className="prize-cheque__fill">seed funding</span></p>
        </div>
      </li>
    </ul>
  </div>
}

// Hand-drawn ticks for the entry checklist, in a 32 × 32 box over each checkbox.
const TICKS = ['M6 17c3 3 5 6 7 9C17 17 22 10 28 4', 'M5 16c3 2 6 6 8 9 3-8 8-15 14-21', 'M7 18c2 2 4 5 6 8 4-8 10-15 16-20']
// The rule most people get wrong (see competeIntro), found by its wording rather than its position.
const isKeyRule = (rule: string) => /University of Windsor/i.test(rule)

/** Who can enter, as an entry checklist on a sheet: every rule ticked in pen, and the one most people miss (only one
    teammate has to study at UWindsor) swiped with highlighter and noted in the margin. */
export function EntryChecklist({ rules }: { rules: string[] }) {
  return <div className="entry-sheet">
    <span className="tape tape--left" aria-hidden="true" /><span className="tape tape--right" aria-hidden="true" />
    <ul className="entry-list">{rules.map((rule, index) => {
      const key = isKeyRule(rule)
      const cut = rule.indexOf('. ') + 1
      return <li key={rule} className={key ? 'is-key' : undefined}>
        <span className="entry-list__box" aria-hidden="true"><svg viewBox="0 0 32 32"><path d={TICKS[index % TICKS.length]} /></svg></span>
        <div>
          <p>{key && cut > 0 ? <><mark>{rule.slice(0, cut)}</mark>{rule.slice(cut)}</> : rule}</p>
          {key && <p className="entry-list__note" aria-hidden="true">Only one of you!</p>}
        </div>
      </li>
    })}</ul>
  </div>
}

// Splits after ". ", "? " or "! " without regex lookbehind, which older Safari cannot parse.
const sentences = (text: string) => text.replace(/([.?!])\s+/g, '$1\n').split('\n')
// Each step reads "N. First sentence. The rest."; the first sentence becomes the step's heading.
function splitStep(step: string) {
  const [heading, ...rest] = sentences(step.replace(/^\d+\.\s*/, ''))
  return [heading, rest.join(' ')]
}
const isOfficialStep = (step: string) => step.includes('hultprize.org/register')
// Lets "hultprize.org/register." wrap after the slash on narrow phones and at large text sizes.
const breakAfterSlash = (text: string) => text.split('/').map((part, i, parts) => i < parts.length - 1 ? <Fragment key={i}>{part}/<wbr /></Fragment> : part)
// Each step's action, matched on its wording. The arrows are glued to the last word so they never wrap alone.
function stepAction(step: string) {
  if (/sign up below/i.test(step)) return <Link className="route-step__link" to="#signup">{'Get on the list\u00a0→'}</Link>
  if (isOfficialStep(step)) return <RegisterButton />
  if (/join our discord/i.test(step)) return <a className="route-step__link" href={SITE.discordUrl} target="_blank" rel="noopener noreferrer">{'Join our Discord\u00a0↗'}</a>
  return null
}

/** How to enter, as one route: each step's number circled in marker along a dashed line, and the official
    registration (the step that enters a team) picked out with a note in the margin. */
export function EntryRoute({ steps }: { steps: string[] }) {
  return <ol className="entry-route">{steps.map((step, index) => {
    const [heading, body] = splitStep(step)
    const official = isOfficialStep(step)
    return <li key={step} className={`route-step${official ? ' route-step--official' : ''}`}>
      <span className="route-step__number" aria-hidden="true">{index + 1}</span>
      {official && <span className="route-step__note" aria-hidden="true">The one that counts!</span>}
      <h3>{breakAfterSlash(heading)}</h3>
      {body && <p>{body}</p>}
      {stepAction(step)}
    </li>
  })}</ol>
}
