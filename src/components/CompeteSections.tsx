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

/** A trophy drawn in the metal of its place: a loving cup (open mouth, engraved band, tube handles) on a knotted stem
    and flared foot, standing on a glossy black base with a screwed-on brushed plaque. The metal's colours come from the
    trophy's CSS (--c1 light, --c2 mid, --c3 dark), so one drawing serves all three. */
function TrophyArt({ tone }: { tone: string }) {
  const id = `trophy-${tone}`
  const url = (name: string) => `url(#${id}-${name})`
  const stop = (offset: string, color: string, opacity = 1) => <stop offset={offset} style={{ stopColor: color, stopOpacity: opacity }} />
  return <svg className="trophy__art" viewBox="0 0 200 244" aria-hidden="true" focusable="false">
    <defs>
      {/* Round polished metal: dark at both edges, a white-hot reflection left of centre, a dim reflection near the
          right edge and a thin rim of light at it. */}
      <linearGradient id={`${id}-metal`} x1="0" x2="1">{stop('0', 'var(--c3)')}{stop('.07', 'var(--c2)')}{stop('.18', 'var(--c1)')}{stop('.26', '#fff')}{stop('.34', 'var(--c1)')}{stop('.6', 'var(--c2)')}{stop('.8', 'var(--c2)')}{stop('.88', 'var(--c3)')}{stop('.95', 'var(--c1)')}{stop('1', 'var(--c3)')}</linearGradient>
      {/* The bowl turns away from the light as it curves under. */}
      <linearGradient id={`${id}-under`} x1="0" x2="0" y2="1">{stop('0', '#fff', .18)}{stop('.35', '#fff', 0)}{stop('.7', '#000', 0)}{stop('1', '#000', .38)}</linearGradient>
      {/* Inside the cup: the far wall catches the light, the near wall is in shadow. */}
      <linearGradient id={`${id}-inside`} x1="0" x2="0" y2="1">{stop('0', 'var(--c1)')}{stop('.45', 'var(--c2)')}{stop('1', 'var(--c3)')}</linearGradient>
      <linearGradient id={`${id}-black`} x1="0" x2="0" y2="1">{stop('0', '#3a3b42')}{stop('.12', '#1c1d22')}{stop('1', '#08080a')}</linearGradient>
      <linearGradient id={`${id}-black-top`} x1="0" x2="1">{stop('0', '#2a2b31')}{stop('.4', '#55575f')}{stop('1', '#2a2b31')}</linearGradient>
      <linearGradient id={`${id}-plate`} x1="0" x2="1" y2=".4">{stop('0', 'var(--c2)')}{stop('.35', 'var(--c1)')}{stop('.55', '#fff', .9)}{stop('.7', 'var(--c1)')}{stop('1', 'var(--c2)')}</linearGradient>
      {/* Brushed finish: fine horizontal grain. */}
      <pattern id={`${id}-brush`} width="4" height="1.6" patternUnits="userSpaceOnUse"><rect width="4" height=".5" fill="#000" opacity=".07" /></pattern>
      <radialGradient id={`${id}-screw`}>{stop('0', '#fff')}{stop('.45', 'var(--c2)')}{stop('1', 'var(--c3)')}</radialGradient>
      <filter id={`${id}-soft`} x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="1.6" /></filter>
      <filter id={`${id}-blur`} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="3" /></filter>
    </defs>

    {/* The base, seen a little from above: its top face, then its front, lit along the top edge. */}
    <ellipse cx="100" cy="241" rx="58" ry="3" fill="#000" opacity=".35" filter={url('blur')} />
    <path d="M60 180H140L150 188H50Z" fill={url('black-top')} />
    <rect x="50" y="188" width="100" height="52" rx="1.5" fill={url('black')} />
    <rect x="50" y="188" width="100" height="1.2" fill="#fff" opacity=".28" />
    {/* The plaque: brushed metal held by four screws. */}
    <rect x="64" y="198" width="72" height="31" rx="2" fill={url('plate')} />
    <rect x="64" y="198" width="72" height="31" rx="2" fill={url('brush')} />
    <rect x="64.5" y="198.5" width="71" height="30" rx="1.6" fill="none" stroke="#000" strokeOpacity=".3" />
    {[[68.5, 202.5], [131.5, 202.5], [68.5, 224.5], [131.5, 224.5]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill={url('screw')} stroke="#000" strokeOpacity=".35" strokeWidth=".5" />)}

    {/* The foot and stem: a flared foot, a knot, and a neck rising into the bowl. */}
    <ellipse cx="100" cy="180" rx="30" ry="4.5" fill={url('metal')} />
    <path d="M70 180V176C70 173 84 171 100 171S130 173 130 176V180Z" fill={url('metal')} />
    <path d="M70 176C70 173 84 171 100 171S130 173 130 176" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1" />
    <path d="M93 145C93 156 88 165 77 172H123C112 165 107 156 107 145Z" fill={url('metal')} />
    <path d="M93 145C93 156 88 165 77 172H123C112 165 107 156 107 145Z" fill={url('under')} />
    <ellipse cx="100" cy="143" rx="14" ry="6" fill={url('metal')} />
    <ellipse cx="100" cy="141.5" rx="12" ry="3" fill="#fff" opacity=".22" />
    <path d="M89 118C92 126 94 132 95 140H105C106 132 108 126 111 118Z" fill={url('metal')} />

    {/* Handles, behind the bowl: a dark tube, the metal over it, and a line of light along each. */}
    <g fill="none" strokeLinecap="round">
      {['M40 36C6 30 4 84 52 96', 'M160 36C194 30 196 84 148 96'].map(d => <g key={d}>
        <path d={d} stroke="var(--c3)" strokeWidth="10" />
        <path d={d} stroke={url('metal')} strokeWidth="7" />
        <path d={d} stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" transform="translate(-1.2 -1.4)" />
      </g>)}
    </g>

    {/* The bowl: polished metal, darkening as it curves under, with an engraved band below the rim. */}
    <path d="M34 22C34 70 52 104 84 116C92 119 108 119 116 116C148 104 166 70 166 22A66 9 0 0 1 34 22Z" fill={url('metal')} />
    <path d="M34 22C34 70 52 104 84 116C92 119 108 119 116 116C148 104 166 70 166 22A66 9 0 0 1 34 22Z" fill={url('under')} />
    <path d="M36 41A64 8.5 0 0 0 164 41" fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="1.2" />
    <path d="M36 42.6A64 8.5 0 0 0 164 42.6" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".8" />
    <path d="M38 47A62 8 0 0 0 162 47" fill="none" stroke="#000" strokeOpacity=".2" strokeWidth=".8" />
    {/* The open mouth, seen from just above, and the rolled rim around it. */}
    <ellipse cx="100" cy="22" rx="66" ry="9" fill={url('inside')} />
    <ellipse cx="100" cy="24" rx="60" ry="6" fill="#000" opacity=".18" />
    <ellipse cx="100" cy="22" rx="66" ry="9" fill="none" stroke={url('metal')} strokeWidth="3.4" />
    <path d="M40 24A62 7.5 0 0 0 160 24" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
    {/* Reflections: a soft streak down the lit side and a glint on the rim. */}
    <path d="M62 30C60 58 66 86 80 104" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" filter={url('soft')} />
    <ellipse cx="66" cy="27" rx="7" ry="1.6" fill="#fff" opacity=".9" filter={url('soft')} />
  </svg>
}

/** What's at stake, in the order a team meets it: a trophy for each campus prize (gold in the middle), then a
    boarding pass to Nationals in Calgary and an oversized cheque for the global prize, each under a handwritten
    caption. The pass and cheque say only what the site says elsewhere; the cheque names no bank and carries no
    signature. */
export function PrizePodium() {
  return <div className="prize-stakes">
    <p className="prize-stage" aria-hidden="true">Win in Windsor</p>
    <ol className="prize-trophies" aria-label="Campus Grand Finale cash prizes">{CAMPUS_PRIZES.map(prize => <li key={prize.place} className={`trophy trophy--${prize.tone}`}>
      <TrophyArt tone={prize.tone} />
      {/* The amount is engraved on the cup, the place on the plaque. */}
      <strong className="trophy__prize">{prize.prize}</strong>
      <span className="trophy__place"><span className="visually-hidden">, </span>{prize.place}<span className="visually-hidden"> place</span></span>
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
