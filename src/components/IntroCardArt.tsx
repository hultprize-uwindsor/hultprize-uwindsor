import { useId, type ComponentType } from 'react'
import { ChartColumn, CodeXml, Megaphone, PenTool, type LucideProps } from 'lucide-react'
import './IntroCardArt.css'

// The intro cards' pictures, drawn as real objects lit from the top left: a jigsaw, a bulb, a ticket, a stopwatch
// and a sack of coins. Each one's sizes are in its own viewBox units.

const svgId = (name: string, id: string) => `${name}-${id.replace(/[^\w-]/g, '')}`

/** Same scatter on every visit: a fixed hash of a position and a channel. */
const jitter = (index: number, channel: number) => {
  const value = Math.sin((index + 1) * 12.9898 + channel * 78.233) * 43758.5453
  return value - Math.floor(value)
}

/** Fine grain mixed into a surface, in its own colour, `alpha` strong. */
function Grain({ id, frequency, color, alpha }: { id: string; frequency: number; color: [number, number, number]; alpha: number }) {
  return <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves="2" seed="4" stitchTiles="stitch" />
    <feColorMatrix values={`0 0 0 0 ${color[0]} 0 0 0 0 ${color[1]} 0 0 0 0 ${color[2]} ${alpha} 0 0 0 ${-alpha / 3}`} />
    <feComposite in2="SourceAlpha" operator="in" />
    <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode /></feMerge>
  </filter>
}

/** Ink that didn't take in a few specks; the higher `cover`, the fewer. */
function Ink({ id, cover = 14 }: { id: string; cover?: number }) {
  return <filter id={id} colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="9" />
    <feColorMatrix values={`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -18 0 0 0 ${cover}`} />
    <feComposite in="SourceGraphic" operator="in" />
  </filter>
}

/** Lying on the card: a tight shadow where it touches and a soft one under the rest. */
function Lift({ id, color, near = .32, far = .18, height = 1 }: { id: string; color: string; near?: number; far?: number; height?: number }) {
  return <filter id={id} x={`${-25 * height}%`} y={`${-25 * height}%`} width={`${100 + 50 * height}%`} height={`${110 + 50 * height}%`} colorInterpolationFilters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation={.7 * height} /><feOffset dy={.9 * height} result="near" />
    <feFlood floodColor={color} floodOpacity={near} /><feComposite in2="near" operator="in" result="nearShadow" />
    <feGaussianBlur in="SourceAlpha" stdDeviation={3.2 * height} /><feOffset dx={1.2 * height} dy={4 * height} result="far" />
    <feFlood floodColor={color} floodOpacity={far} /><feComposite in2="far" operator="in" result="farShadow" />
    <feMerge><feMergeNode in="farShadow" /><feMergeNode in="nearShadow" /><feMergeNode in="SourceGraphic" /></feMerge>
  </filter>
}

// ---------------------------------------------------------------------------------------------------------------------
// The team: a jigsaw of four skills, three pieces together and the fourth about to go in.

const S = 56
const OX = 44
const OY = 20
// One side's knob, as fractions of a side: along it, then outward from the piece. Symmetric, so neighbours meet.
const KNOB = [[.34, 0], [.40, 0, .41, .07, .37, .12], [.32, .22, .40, .31, .50, .31], [.60, .31, .68, .22, .63, .12], [.59, .07, .60, 0, .66, 0], [1, 0]]

/** One side of a piece from (x0, y0) to (x1, y1), travelling clockwise: a knob out (1), a hole in (-1) or straight. */
function side(x0: number, y0: number, x1: number, y1: number, knob: number) {
  const ux = (x1 - x0) / S, uy = (y1 - y0) / S
  const at = (a: number, b: number) => `${(x0 + (ux * a + uy * b * knob) * S).toFixed(2)} ${(y0 + (uy * a - ux * b * knob) * S).toFixed(2)}`
  if (!knob) return `L${x1} ${y1}`
  return KNOB.map(p => p.length === 2 ? `L${at(p[0], p[1])}` : `C${at(p[0], p[1])} ${at(p[2], p[3])} ${at(p[4], p[5])}`).join('')
}

type Piece = { col: number; row: number; sides: [number, number, number, number]; color: string; icon: ComponentType<LucideProps>; lifted?: boolean }
const PIECES: Piece[] = [
  { col: 0, row: 0, sides: [0, 1, -1, 0], color: '#e0357f', icon: CodeXml },
  { col: 1, row: 0, sides: [0, 0, 1, -1], color: '#1f4f80', icon: PenTool },
  { col: 0, row: 1, sides: [1, -1, 0, 0], color: '#eeac2f', icon: ChartColumn },
  { col: 1, row: 1, sides: [-1, 0, 0, 1], color: '#3a8bd0', icon: Megaphone, lifted: true },
]

function piecePath({ col, row, sides }: Piece) {
  const x = OX + col * S, y = OY + row * S
  return `M${x} ${y}${side(x, y, x + S, y, sides[0])}${side(x + S, y, x + S, y + S, sides[1])}${side(x + S, y + S, x, y + S, sides[2])}${side(x, y + S, x, y, sides[3])}Z`
}

/** The team card's picture: die-cut card pieces, each printed with a different skill, with a bevel where the cutter
    pressed the edges down and the grey board showing at the cut. */
export function TeamPuzzle() {
  const id = svgId('puzzle', useId())
  const draw = (piece: Piece) => {
    const shape = piecePath(piece)
    const cx = OX + piece.col * S + S / 2, cy = OY + piece.row * S + S / 2
    const Icon = piece.icon
    return <g key={piece.color} filter={`url(#${id}-${piece.lifted ? 'high' : 'low'})`}>
      <path d={shape} fill="#b9b09c" transform="translate(0 1.8)" />
      <g filter={`url(#${id}-bevel)`}>
        <path d={shape} fill={piece.color} />
        <Icon x={cx - 11} y={cy - 11} size={22} color="#fff" strokeWidth={2.3} opacity={.92} />
      </g>
    </g>
  }
  const lifted = PIECES.find(piece => piece.lifted)!
  return <span className="team-puzzle" aria-hidden="true">
    <svg viewBox="0 0 220 176">
      <defs>
        <Lift id={`${id}-low`} color="#163626" near={.36} far={.2} />
        <Lift id={`${id}-high`} color="#163626" near={.1} far={.24} height={3} />
        {/* The cutter's bevel: the face lit from the top left, rounded down at its edges, with the board's grain. */}
        <filter id={`${id}-bevel`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="2.4" diffuseConstant="1" lightingColor="#fff" result="light"><feDistantLight azimuth="225" elevation="52" /></feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1.24" result="lit" />
          <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="3" result="noise" />
          <feColorMatrix in="noise" values="0 0 0 0 .1 0 0 0 0 .08 0 0 0 0 .05 .13 0 0 0 -.04" result="grain" />
          <feMerge result="grained"><feMergeNode in="lit" /><feMergeNode in="grain" /></feMerge>
          <feComposite in="grained" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      {PIECES.filter(piece => !piece.lifted).map(draw)}
      <g transform={`translate(24 19) rotate(14 ${OX + S * 1.5} ${OY + S * 1.5})`}>{draw(lifted)}</g>
    </svg>
  </span>
}

// ---------------------------------------------------------------------------------------------------------------------
// Student ideas: a bulb switching on.

// The glass: a round globe narrowing to the neck that meets the base.
const BULB = 'M84 138C84 126 79 117 70 107A50 50 0 1 1 130 107C121 117 116 126 116 138Z'
const COIL = 'M88 90c1.2-3.8 4.8-3.8 6 0c1.2-3.8 4.8-3.8 6 0c1.2-3.8 4.8-3.8 6 0c1.2-3.8 4.8-3.8 6 0'

/** The student ideas card's picture: an incandescent bulb, drawn off, with its light over it. The light flickers on,
    the filament glows white hot, light fills the glass and spills warm across the card, then it fades and comes on
    again. With reduced motion it stays on. */
export function IdeaBulb() {
  const id = svgId('bulb', useId())
  return <svg className="idea-bulb" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-halo`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff4c4" /><stop offset=".3" stopColor="#ffe27a" stopOpacity=".8" /><stop offset=".62" stopColor="#ffcf50" stopOpacity=".3" /><stop offset="1" stopColor="#ffcf50" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-core`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff" /><stop offset=".45" stopColor="#fffbe6" stopOpacity=".85" /><stop offset="1" stopColor="#fff3c0" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-glass`} cx=".5" cy=".46" r=".62"><stop offset="0" stopColor="#fffef5" /><stop offset=".34" stopColor="#fff3bd" /><stop offset=".72" stopColor="#ffd96c" /><stop offset="1" stopColor="#f0b142" /></radialGradient>
      {/* Off, the glass is clear: the card's blue through it, greyer towards its curved edges. */}
      <radialGradient id={`${id}-clear`} cx=".42" cy=".4" r=".66"><stop offset="0" stopColor="#f7fafd" stopOpacity=".7" /><stop offset=".7" stopColor="#d9e3ee" stopOpacity=".75" /><stop offset="1" stopColor="#a9b9ca" stopOpacity=".9" /></radialGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7d838b" /><stop offset=".3" stopColor="#f3f5f7" /><stop offset=".55" stopColor="#b4bac1" /><stop offset=".85" stopColor="#6c727a" /><stop offset="1" stopColor="#8d939a" /></linearGradient>
      <linearGradient id={`${id}-groove`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4a4f56" /><stop offset=".3" stopColor="#9aa0a7" /><stop offset=".7" stopColor="#5b6067" /><stop offset="1" stopColor="#3e434a" /></linearGradient>
      <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a6a2a" /><stop offset=".4" stopColor="#e6c77c" /><stop offset="1" stopColor="#7a5a20" /></linearGradient>
      <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.6" /></filter>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".8" /></filter>
      <filter id={`${id}-bloom`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
    </defs>
    <g className="idea-bulb__light idea-bulb__glow">
      <circle cx="100" cy="72" r="100" fill={`url(#${id}-halo)`} />
      <path d={BULB} fill="#ffdc6a" opacity=".9" filter={`url(#${id}-bloom)`} />
    </g>
    <ellipse cx="106" cy="188" rx="30" ry="4.5" fill="#1a2a4a" opacity=".22" filter={`url(#${id}-blur)`} />
    {/* The screw base: threads, the black insulator and the contact. */}
    <rect x="84" y="136" width="32" height="30" fill={`url(#${id}-groove)`} />
    {[0, 1, 2, 3].map(k => <rect key={k} x="82.5" y={138.5 + k * 7} width="35" height="5.6" rx="2.8" fill={`url(#${id}-metal)`} transform={`rotate(-4 100 ${141.3 + k * 7})`} />)}
    <path d="M88 166H112L108 174H92Z" fill="#1c1c1f" />
    <path d="M94 174H106C106 178 103 180 100 180C97 180 94 178 94 174Z" fill={`url(#${id}-brass)`} />
    {/* The glass, clear and then full of light, its stem, its wires, and the coil cold and then hot. */}
    <path d={BULB} fill={`url(#${id}-clear)`} />
    <path className="idea-bulb__light" d={BULB} fill={`url(#${id}-glass)`} />
    <path d="M93 138L95.5 113Q100 106 104.5 113L107 138Z" fill="#fff" opacity=".38" />
    <path d="M92.5 132V110L88 90M107.5 132V110L112 90" fill="none" stroke="#7d6a52" strokeWidth="1" opacity=".75" />
    <path d={COIL} fill="none" stroke="#5c4c3a" strokeWidth="1.2" />
    <g className="idea-bulb__light">
      <circle cx="100" cy="84" r="30" fill={`url(#${id}-core)`} />
      <path d={COIL} fill="none" stroke="#ffb02e" strokeWidth="10" opacity=".8" filter={`url(#${id}-blur)`} />
      <path d={COIL} fill="none" stroke="#fff0b0" strokeWidth="2.6" filter={`url(#${id}-soft)`} />
      <path d={COIL} fill="none" stroke="#fffdf2" strokeWidth="1.2" />
    </g>
    <path d={BULB} fill="none" stroke="#97a8ba" strokeWidth="1.3" opacity=".8" />
    <path className="idea-bulb__light" d={BULB} fill="none" stroke="#dc9a30" strokeWidth="1.3" opacity=".8" />
    {/* Reflections on the glass, from the room's light. */}
    <path d="M71 56C74 41 85 30 99 26" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".8" filter={`url(#${id}-soft)`} />
    <ellipse cx="125" cy="45" rx="2.8" ry="7" fill="#fff" opacity=".6" transform="rotate(38 125 45)" />
  </svg>
}

// ---------------------------------------------------------------------------------------------------------------------
// The starting point: a free ticket.

// One ticket off the roll, in its own units, drawn like the Ticket Jar's raffle tickets: a stub priced in red, then the
// ticket, split by a perforation notched at both edges, both ends torn from the roll.
const TW = 164
const TH = 76
const TSTUB = 44
const TNOTCH = 4

/** The edge left by tearing along a perforation: little nubs where the paper between the holes gave way. */
function tornEdge(x: number, from: number, to: number, outward: number, seed: number) {
  const steps = Math.round(Math.abs(to - from) / 1.6)
  return Array.from({ length: steps + 1 }, (_, k) => {
    const nub = k % 2 ? -.25 : jitter(seed + k, 9) * .9 - .2
    return `L${(x + outward * nub).toFixed(2)} ${(from + (to - from) * k / steps).toFixed(2)}`
  }).join('')
}

function ticketOutline() {
  const left = -TW / 2, top = -TH / 2, perforation = left + TSTUB
  return `M${left} ${top}H${perforation - TNOTCH}A${TNOTCH} ${TNOTCH} 0 0 0 ${perforation + TNOTCH} ${top}H${-left}${tornEdge(-left, top, -top, 1, 3)}`
    + `H${perforation + TNOTCH}A${TNOTCH} ${TNOTCH} 0 0 0 ${perforation - TNOTCH} ${-top}H${left}${tornEdge(left, -top, top, -1, 43)}Z`
}

/** The $0 card's picture: a yellow admission ticket, ADMIT ONE, FREE, on card stock with a grain, its ink missing in
    specks, lying a little askew. */
export function FreeTicket() {
  const id = svgId('ticket', useId())
  const shape = ticketOutline()
  const left = -TW / 2, top = -TH / 2, perforation = left + TSTUB, main = (perforation + TW / 2) / 2
  return <strong className="free-ticket">
    <svg viewBox="0 0 200 108" aria-hidden="true">
      <defs>
        <Lift id={`${id}-lift`} color="#4a2338" near={.32} far={.18} />
        <Grain id={`${id}-grain`} frequency={.9} color={[.3, .24, .16]} alpha={.3} />
        <Ink id={`${id}-ink`} />
        <linearGradient id={`${id}-bend`} x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stopColor="#fff" stopOpacity=".22" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".09" /></linearGradient>
      </defs>
      <g transform="translate(100 53) rotate(-7)">
        <g filter={`url(#${id}-lift)`}><g filter={`url(#${id}-grain)`}>
          <path d={shape} fill="#f6d65c" stroke="#000" strokeOpacity=".1" strokeWidth=".5" />
          <path d={shape} fill={`url(#${id}-bend)`} />
          <path d={`M${perforation} ${top + TNOTCH}V${-top - TNOTCH}`} fill="none" stroke="#000" strokeOpacity=".2" strokeWidth=".9" strokeDasharray="1.2 1.8" transform="translate(.45 0)" />
          <path d={`M${perforation} ${top + TNOTCH}V${-top - TNOTCH}`} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".9" strokeDasharray="1.2 1.8" />
        </g></g>
        <g filter={`url(#${id}-ink)`}>
          <rect className="free-ticket__rule" x={left + 3} y={top + 3} width={TSTUB - 6.4} height={TH - 6} rx=".7" />
          <rect className="free-ticket__rule" x={perforation + 3.2} y={top + 3} width={TW - TSTUB - 6.2} height={TH - 6} rx=".7" />
          <rect className="free-ticket__rule free-ticket__rule--fine" x={perforation + 5.2} y={top + 5} width={TW - TSTUB - 10.2} height={TH - 10} rx=".5" />
          <text className="free-ticket__price" transform={`translate(${left + TSTUB / 2} 0) rotate(-90)`}>$0.00</text>
          <text className="free-ticket__admit" x={main} y="-16">ADMIT ONE</text>
          <text className="free-ticket__free" x={main} y="13">FREE</text>
          <text className="free-ticket__what" x={main} y="26">ENTRY + 5 WORKSHOPS</text>
        </g>
      </g>
    </svg>
    <span className="visually-hidden">$0</span>
  </strong>
}

// ---------------------------------------------------------------------------------------------------------------------
// Four minutes: a stopwatch on a four-minute dial.

const TICKS = Array.from({ length: 48 }, (_, i) => i)

/** The four-minute card's picture: a chrome stopwatch with an enamel dial under glass. A press of the crown starts it,
    the hand sweeps round, and at four minutes it rings and shakes. With reduced motion it rests at four minutes. */
export function PitchTimer() {
  const id = svgId('timer', useId())
  const chrome = (name: string, x1: number, y1: number, x2: number, y2: number) => <linearGradient id={`${id}-${name}`} x1={x1} y1={y1} x2={x2} y2={y2}>
    <stop offset="0" stopColor="#ffffff" /><stop offset=".18" stopColor="#c3c9d0" /><stop offset=".34" stopColor="#f6f7f9" />
    <stop offset=".54" stopColor="#959da7" /><stop offset=".72" stopColor="#e4e7eb" /><stop offset=".88" stopColor="#868e98" /><stop offset="1" stopColor="#c6cbd1" />
  </linearGradient>
  return <svg className="pitch-timer" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      {chrome('chrome', 0, 0, 1, 1)}{chrome('bezel', 1, 1, 0, 0)}{chrome('crown', 0, 0, 1, 0)}
      <radialGradient id={`${id}-dial`} cx=".44" cy=".4" r=".62"><stop offset="0" stopColor="#ffffff" /><stop offset=".72" stopColor="#f7f5f0" /><stop offset="1" stopColor="#dfdbd2" /></radialGradient>
      {/* The bezel's shadow falls on the top of the dial. */}
      <radialGradient id={`${id}-dial-shade`} cx=".5" cy=".57" r=".56"><stop offset=".8" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".2" /></radialGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2=".7" y2=".9"><stop offset="0" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <pattern id={`${id}-knurl`} width="2" height="4" patternUnits="userSpaceOnUse"><path d="M.5 0v4" stroke="#4d545c" strokeOpacity=".45" strokeWidth=".8" /></pattern>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
      <filter id={`${id}-hand-shadow`} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.3" dy="1.9" stdDeviation=".9" floodColor="#000" floodOpacity=".28" /></filter>
      <clipPath id={`${id}-face`}><circle cx="100" cy="112" r="52.5" /></clipPath>
    </defs>
    <circle cx="104" cy="119" r="61" fill="#1e2540" opacity=".3" filter={`url(#${id}-shadow)`} />
    <g className="pitch-timer__ring" fill="none" stroke="#002b51" strokeWidth="2.4" strokeLinecap="round" strokeOpacity=".55">
      <path d="M40.3 61.9A78 78 0 0 1 61 44.5M26.4 58.4A90 90 0 0 1 56.6 31.4" />
      <path d="M159.7 61.9A78 78 0 0 0 139 44.5M173.6 58.4A90 90 0 0 0 143.4 31.4" />
    </g>
    <g className="pitch-timer__body">
      <circle cx="100" cy="21" r="10" fill="none" stroke="#6c737c" strokeWidth="6" />
      <circle cx="100" cy="21" r="10" fill="none" stroke={`url(#${id}-chrome)`} strokeWidth="4.4" />
      {[-40, 40].map(turn => <g key={turn} transform={`rotate(${turn} 100 112)`}>
        <rect x="94.5" y="41" width="11" height="12" rx="1.5" fill={`url(#${id}-crown)`} stroke="#5d646d" strokeWidth=".8" />
        <rect x="92.5" y="37" width="15" height="6" rx="2" fill={`url(#${id}-crown)`} stroke="#5d646d" strokeWidth=".8" />
      </g>)}
      <g className="pitch-timer__button">
        <rect x="95" y="40" width="10" height="12" fill={`url(#${id}-crown)`} stroke="#5d646d" strokeWidth=".8" />
        <rect x="87" y="28" width="26" height="14" rx="3" fill={`url(#${id}-crown)`} stroke="#5d646d" strokeWidth=".8" />
        <rect x="87" y="28" width="26" height="14" rx="3" fill={`url(#${id}-knurl)`} />
      </g>
      <circle cx="100" cy="112" r="62" fill={`url(#${id}-chrome)`} stroke="#5f666e" strokeWidth=".9" />
      <circle cx="100" cy="112" r="57" fill={`url(#${id}-bezel)`} />
      <circle cx="100" cy="112" r="53.6" fill="#4a5058" />
      <circle cx="100" cy="112" r="52.5" fill={`url(#${id}-dial)`} />
      <circle className="pitch-timer__elapsed" cx="100" cy="112" r="48.5" fill="none" stroke="#da2381" strokeWidth="2.4" strokeDasharray="304.73" opacity=".85" transform="rotate(-90 100 112)" />
      <circle cx="100" cy="112" r="46.2" fill="none" stroke="#1c1c1e" strokeWidth=".6" />
      {TICKS.map(i => <line key={i} x1="100" x2="100" y1={i % 12 ? i % 3 ? 112 - 43.6 : 112 - 41.6 : 112 - 38.6} y2={112 - 46.2} stroke="#1c1c1e" strokeWidth={i % 12 ? i % 3 ? .7 : 1.2 : 2.1} transform={`rotate(${i * 7.5} 100 112)`} />)}
      <g fill="#1c1c1e" fontSize="11.5" fontWeight="700" textAnchor="middle">
        <text x="100" y="85.5">4</text><text x="131" y="116">1</text><text x="100" y="147">2</text><text x="69" y="116">3</text>
      </g>
      <text x="100" y="97" fill="#4a4a4a" fontSize="4.6" fontWeight="700" letterSpacing="1.3" textAnchor="middle">HULT PRIZE</text>
      <text x="100" y="132" fill="#6a6a6a" fontSize="4.2" letterSpacing="1.1" textAnchor="middle">MINUTES</text>
      <circle cx="100" cy="112" r="52.5" fill={`url(#${id}-dial-shade)`} />
      <g filter={`url(#${id}-hand-shadow)`}>
        <g className="pitch-timer__hand">
          <path d="M98.8 127L99.4 64L100 58.5L100.6 64L101.2 127Z" fill="#d1235f" />
          <circle cx="100" cy="123" r="3.2" fill="#d1235f" />
        </g>
      </g>
      <circle cx="100" cy="112" r="4.4" fill={`url(#${id}-chrome)`} stroke="#5f666e" strokeWidth=".6" />
      <circle cx="100" cy="112" r="1.3" fill="#5f666e" />
      {/* The glass: a broad soft reflection and a sharp glint. */}
      <g clipPath={`url(#${id}-face)`}>
        <ellipse cx="78" cy="86" rx="40" ry="17" fill={`url(#${id}-glass)`} opacity=".55" transform="rotate(-36 78 86)" />
        <ellipse cx="66" cy="80" rx="6.5" ry="2.2" fill="#fff" opacity=".85" transform="rotate(-42 66 80)" />
      </g>
    </g>
  </svg>
}

// ---------------------------------------------------------------------------------------------------------------------
// The global prize: a sack of gold coins.

/** A gold coin in perspective: its face lit from the top left, a raised rim, and a milled edge `t` deep. A coin on
    its edge is one turned -90, the edge then showing to the right. */
function Coin({ id, x, y, r = 11, tilt = .42, t = 3, a = 0, shadow }: { id: string; x: number; y: number; r?: number; tilt?: number; t?: number; a?: number; shadow?: boolean }) {
  const ry = r * tilt
  const milling = Array.from({ length: 15 }, (_, k) => {
    const angle = Math.PI * (k + .5) / 15
    return `M${(r * Math.cos(angle)).toFixed(2)} ${(ry * Math.sin(angle)).toFixed(2)}v${t}`
  }).join('')
  return <g transform={`translate(${x} ${y}) rotate(${a})`}>
    {shadow && <ellipse cx="1.5" cy={t + 1.2} rx={r + 1} ry={ry + 1} fill="#000" opacity=".45" filter={`url(#${id}-blur)`} />}
    <path d={`M${-r} 0v${t}a${r} ${ry} 0 0 0 ${2 * r} 0v${-t}z`} fill={`url(#${id}-coin-edge)`} />
    <path d={milling} stroke="#5e3b05" strokeOpacity=".4" strokeWidth=".55" />
    <ellipse rx={r} ry={ry} fill={`url(#${id}-coin-face)`} />
    <ellipse rx={r * .76} ry={ry * .76} fill="none" stroke="#fff3bd" strokeOpacity=".75" strokeWidth=".9" transform="translate(-.35 -.3)" />
    <ellipse rx={r * .76} ry={ry * .76} fill="none" stroke="#9a6410" strokeOpacity=".6" strokeWidth=".9" transform="translate(.35 .3)" />
    <ellipse rx={r} ry={ry} fill="none" stroke="#6b4508" strokeOpacity=".5" strokeWidth=".6" />
  </g>
}

// The sack's outline: flared open at the top, gathered at the neck, full at the bottom.
const SACK = 'M66 34C70 42 78 48 82 56C54 68 32 96 34 126C36 152 62 166 100 166C138 166 164 152 166 126C168 96 146 68 118 56C122 48 130 42 134 34C120 41 80 41 66 34Z'
// The drawstring, loosened, and its two ends.
const STRING = 'M80 54C92 61 108 61 120 54'
const STRING_ENDS = 'M106 59C104 70 98 77 93 86M107 59C113 69 119 73 122 82'

/** The $1M card's picture: a burlap sack, printed $1M, open at the top, heaped with gold coins that spill down its
    side and across the ground. */
export function MoneyBag() {
  const id = svgId('bag', useId())
  const coin = (props: Omit<Parameters<typeof Coin>[0], 'id'>) => <Coin id={id} {...props} />
  return <strong className="money-bag">
    <svg viewBox="0 0 220 180" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-sack`} cx=".36" cy=".42" r=".72"><stop offset="0" stopColor="#ecd5a6" /><stop offset=".45" stopColor="#d7b47c" /><stop offset=".82" stopColor="#ad8650" /><stop offset="1" stopColor="#86643a" /></radialGradient>
        <linearGradient id={`${id}-sack-foot`} x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stopColor="#2a1607" stopOpacity="0" /><stop offset="1" stopColor="#2a1607" stopOpacity=".38" /></linearGradient>
        <radialGradient id={`${id}-mouth`} cx=".5" cy=".7" r=".6"><stop offset="0" stopColor="#2a1708" /><stop offset="1" stopColor="#5a3a19" /></radialGradient>
        <linearGradient id={`${id}-coin-face`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff4bf" /><stop offset=".3" stopColor="#f7cf58" /><stop offset=".7" stopColor="#dfa22a" /><stop offset="1" stopColor="#b47c16" /></linearGradient>
        <linearGradient id={`${id}-coin-edge`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d8a02c" /><stop offset=".5" stopColor="#a66d0e" /><stop offset="1" stopColor="#784a05" /></linearGradient>
        <linearGradient id={`${id}-rope`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c39a62" /><stop offset="1" stopColor="#6d4a22" /></linearGradient>
        <pattern id={`${id}-weave`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
          <path d="M0 .75h3M0 2.25h3" stroke="#4a2c0e" strokeWidth=".55" opacity=".22" /><path d="M.75 0v3M2.25 0v3" stroke="#fff2d6" strokeWidth=".5" opacity=".2" />
        </pattern>
        <Grain id={`${id}-grain`} frequency={1.3} color={[.22, .13, .05]} alpha={.4} />
        <Ink id={`${id}-ink`} cover={15.8} />
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.4" /></filter>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3" /></filter>
        <filter id={`${id}-ground`} x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="4" /></filter>
        <clipPath id={`${id}-clip`}><path d={SACK} /></clipPath>
      </defs>
      <ellipse cx="108" cy="168" rx="80" ry="8" fill="#000" opacity=".5" filter={`url(#${id}-ground)`} />
      <ellipse cx="102" cy="165" rx="54" ry="3.6" fill="#000" opacity=".55" filter={`url(#${id}-blur)`} />
      {/* The mouth, and the coins heaped in it. */}
      <path d="M66 34C78 21 122 21 134 34C122 41 78 41 66 34Z" fill={`url(#${id}-mouth)`} />
      {coin({ x: 82, y: 30, a: -14 })}{coin({ x: 118, y: 30, a: 14 })}{coin({ x: 100, y: 26, r: 12, a: 4 })}
      {coin({ x: 89, y: 19, a: -8 })}{coin({ x: 111, y: 17, a: 11 })}{coin({ x: 100, y: 10, r: 10, a: -3 })}
      {coin({ x: 127, y: 15, r: 10, tilt: .72, a: -62 })}
      {/* The sack: burlap with its weave and grain, rounded by the light, folds gathered under the string. */}
      <g filter={`url(#${id}-grain)`}>
        <path d={SACK} fill={`url(#${id}-sack)`} />
        <path d={SACK} fill={`url(#${id}-weave)`} />
        <path d={SACK} fill={`url(#${id}-sack-foot)`} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        <g filter={`url(#${id}-soft)`} fill="none" strokeLinecap="round">
          <path d="M86 61C83 73 77 85 68 97M96 63C95 77 92 90 88 102M106 63C108 75 112 87 119 98M115 61C121 71 129 81 138 90M74 37C77 44 79 50 82 55M126 37C123 44 121 50 118 55M100 40C100 46 100 51 100 56" stroke="#4a2c0e" strokeWidth="3" opacity=".42" />
          <path d="M83 60C80 72 74 83 65 94M93 63C92 77 89 89 85 100M109 63C111 74 115 85 122 95M118 60C124 70 132 79 141 87M71 37C74 44 76 50 79 55M129 37C126 44 124 50 121 55" stroke="#fbebc6" strokeWidth="2.2" opacity=".45" />
        </g>
        <path d="M66 34C80 41.5 120 41.5 134 34" fill="none" stroke="#f6e5bf" strokeWidth="2.4" opacity=".75" />
        <path d="M68 37C80 44 120 44 132 37" fill="none" stroke="#3a2209" strokeWidth="2" opacity=".35" filter={`url(#${id}-blur)`} />
        <path d="M54 92C46 110 48 134 62 150" fill="none" stroke="#fff1d0" strokeWidth="7" strokeLinecap="round" opacity=".35" filter={`url(#${id}-soft)`} />
        <g className="money-bag__print" filter={`url(#${id}-ink)`}>
          <text x="100" y="131" textAnchor="middle" transform="rotate(-5 100 118)" fill="#132a44" fontSize="40" fontWeight="800" letterSpacing="-1.6">$1M</text>
        </g>
      </g>
      <path d={SACK} fill="none" stroke="#3d240b" strokeWidth="1" opacity=".55" />
      {/* The string, twisted, its ends frayed. */}
      <g fill="none" strokeLinecap="round">
        <path d={`${STRING}${STRING_ENDS}`} stroke="#3d240b" strokeWidth="5.4" opacity=".5" transform="translate(.6 1.4)" filter={`url(#${id}-blur)`} />
        <path d={`${STRING}${STRING_ENDS}`} stroke={`url(#${id}-rope)`} strokeWidth="4.4" />
        <path d={`${STRING}${STRING_ENDS}`} stroke="#4f3214" strokeWidth="4.4" strokeDasharray="1.3 2" opacity=".55" />
        <path d={`${STRING}${STRING_ENDS}`} stroke="#ead0a0" strokeWidth="1.1" strokeDasharray="2 1.3" opacity=".6" transform="translate(-.4 -.9)" />
        <path d="M93 86l-2 4M93 86l.5 4.4M93 86l-3.6 2.2M122 82l1.4 4.2M122 82l3.4 2.6M122 82l-.6 4.4" stroke="#8a6234" strokeWidth=".9" />
      </g>
      <circle cx="106.5" cy="59" r="4.2" fill={`url(#${id}-rope)`} stroke="#4f3214" strokeWidth=".8" />
      {/* Spilling down the side and over the ground. */}
      {coin({ x: 146, y: 44, r: 9, tilt: .78, a: -120 })}
      {coin({ x: 162, y: 68, r: 9.5, tilt: .63, a: -58 })}
      {coin({ x: 178, y: 162, shadow: true })}{coin({ x: 179, y: 156.6 })}{coin({ x: 177, y: 151.2, a: -5 })}
      {coin({ x: 151, y: 168, a: 6, shadow: true })}
      {coin({ x: 204, y: 150, r: 12, tilt: .7, t: 3.4, a: -90, shadow: true })}
      {coin({ x: 40, y: 164, a: -4, shadow: true })}{coin({ x: 41, y: 158.6, a: 3 })}
      {coin({ x: 20, y: 168, r: 10, a: -8, shadow: true })}
      {coin({ x: 66, y: 170, r: 10, a: 5, shadow: true })}
    </svg>
    <span className="visually-hidden">$1M</span>
  </strong>
}
