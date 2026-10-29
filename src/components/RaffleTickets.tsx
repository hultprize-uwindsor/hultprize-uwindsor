import { useId } from 'react'
import './RaffleTickets.css'

/** Same scatter on every visit: a fixed hash of the position along an edge and a channel. */
const jitter = (index: number, channel: number) => {
  const value = Math.sin((index + 1) * 12.9898 + channel * 78.233) * 43758.5453
  return value - Math.floor(value)
}

// One double ticket off the roll, in its own units: a numbered stub, then the ticket, split by a perforation notched
// at both edges. Tickets on a roll join end to end at another perforation.
const W = 118
const H = 54
const STUB = 32
const NOTCH = 3.4

/** The edge left by tearing along a perforation: little nubs where the paper between the holes gave way. */
function tornEdge(x: number, from: number, to: number, outward: number, seed: number) {
  const steps = Math.round(Math.abs(to - from) / 1.6)
  return Array.from({ length: steps + 1 }, (_, k) => {
    const nub = k % 2 ? -.25 : jitter(seed + k, 9) * .9 - .2
    return `L${(x + outward * nub).toFixed(2)} ${(from + (to - from) * k / steps).toFixed(2)}`
  }).join('')
}

/** A run of tickets still joined end to end, torn off the roll at both ends. */
function outline(count: number, seed: number) {
  const left = -count * W / 2
  const top = -H / 2
  const perforations = Array.from({ length: count }, (_, i) => left + i * W + STUB)
  return `M${left} ${top}${perforations.map(x => `H${x - NOTCH}A${NOTCH} ${NOTCH} 0 0 0 ${x + NOTCH} ${top}`).join('')}H${-left}${tornEdge(-left, top, -top, 1, seed)}`
    + `${[...perforations].reverse().map(x => `H${x + NOTCH}A${NOTCH} ${NOTCH} 0 0 0 ${x - NOTCH} ${-top}`).join('')}H${left}${tornEdge(left, -top, top, -1, seed + 40)}Z`
}

type Piece = { first: number; count: number; stock: string; x: number; y: number; turn: number; seed: number; strip?: boolean }

// Two loose tickets from other events' rolls, and this one's strip laid over them.
const PIECES: Piece[] = [
  { first: 311, count: 1, stock: '#f6d65c', x: 120, y: 104, turn: -17, seed: 1 },
  { first: 158, count: 1, stock: '#8cbde9', x: 264, y: 204, turn: 7, seed: 3 },
  { first: 427, count: 3, stock: '#f590bd', x: 200, y: 156, turn: -9, seed: 2, strip: true },
]

function Tickets({ id, piece, game, prize, draw }: { id: string; piece: Piece; game: string; prize: string; draw: string }) {
  const { first, count, stock, x, y, turn, seed, strip } = piece
  const left = -count * W / 2
  const top = -H / 2
  const shape = outline(count, seed)
  const clip = `${id}-clip-${seed}`
  const tickets = Array.from({ length: count }, (_, i) => ({ at: left + i * W, number: String(first + i).padStart(4, '0') }))
  const perforations = tickets.map(({ at }, i) => `M${at + STUB} ${top + NOTCH}V${-top - NOTCH}${i ? `M${at} ${top}V${-top}` : ''}`).join('')
  return <g className={strip ? 'raffle-tickets__strip' : undefined} transform={`translate(${x} ${y}) rotate(${turn})`}>
    <clipPath id={clip}><path d={shape} /></clipPath>
    <g filter={`url(#${id}-lift)`}><g filter={`url(#${id}-grain)`}>
      <path d={shape} fill={stock} stroke="#000" strokeOpacity=".1" strokeWidth=".5" />
      {/* Each ticket bends a little at its perforations, so catches the light a little differently. */}
      <g clipPath={`url(#${clip})`}>{tickets.map(({ at }) => <rect key={at} x={at} y={top} width={W} height={H} fill={`url(#${id}-bend)`} />)}</g>
      <path d={perforations} fill="none" stroke="#000" strokeOpacity=".2" strokeWidth=".8" strokeDasharray="1.1 1.6" transform="translate(.4 0)" />
      <path d={perforations} fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth=".8" strokeDasharray="1.1 1.6" />
      <g filter={`url(#${id}-ink)`}>{tickets.map(({ at, number }) => <g key={number}>
        <rect className="raffle-tickets__rule" x={at + 2.6} y={top + 2.6} width={STUB - 5.4} height={H - 5.2} rx=".6" />
        <rect className="raffle-tickets__rule" x={at + STUB + 2.8} y={top + 2.6} width={W - STUB - 5.4} height={H - 5.2} rx=".6" />
        <rect className="raffle-tickets__rule raffle-tickets__rule--fine" x={at + STUB + 4.4} y={top + 4.2} width={W - STUB - 8.6} height={H - 8.4} rx=".4" />
        <text className="raffle-tickets__number" transform={`translate(${at + STUB / 2} 0) rotate(-90)`}>Nº {number}</text>
        <text className="raffle-tickets__game" x={at + (W + STUB) / 2} y="-12">{game.toUpperCase()}</text>
        <text className="raffle-tickets__prize" x={at + (W + STUB) / 2} y="9.5">{prize}</text>
        <text className="raffle-tickets__draw" x={at + (W + STUB) / 2} y="19.5">{draw.toUpperCase()}</text>
      </g>)}</g>
    </g></g>
  </g>
}

/**
 * The minigame's picture: a strip of this term's raffle tickets, torn off the roll, lying over two loose tickets from
 * other events. Card stock with a grain, ink that missed in places, and perforations torn into little nubs.
 */
export default function RaffleTickets({ game, prize, draw }: { game: string; prize: string; draw: string }) {
  const id = `tickets-${useId().replace(/[^\w-]/g, '')}`
  return <span className="post-art post-art--tickets" aria-hidden="true">
    <svg viewBox="0 0 400 300">
      <defs>
        <linearGradient id={`${id}-bend`} x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stopColor="#fff" stopOpacity=".2" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".09" /></linearGradient>
        <filter id={`${id}-grain`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" /><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .24 0 0 0 0 .16 .32 0 0 0 -.1" /><feComposite in2="SourceAlpha" operator="in" /><feMerge><feMergeNode in="SourceGraphic" /><feMergeNode /></feMerge></filter>
        {/* Ink that didn't take in a few specks, as on a cheap print run. */}
        <filter id={`${id}-ink`} colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="9" /><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -22 0 0 0 17" /><feComposite in="SourceGraphic" operator="in" /></filter>
        {/* Lying on the page: a tight shadow where the paper touches, a soft one where it lifts. */}
        <filter id={`${id}-lift`} x="-10%" y="-30%" width="120%" height="170%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation=".7" /><feOffset dy=".8" result="near" /><feFlood floodColor="#2a1405" floodOpacity=".34" /><feComposite in2="near" operator="in" result="nearShadow" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" /><feOffset dy="6" result="far" /><feFlood floodColor="#2a1405" floodOpacity=".17" /><feComposite in2="far" operator="in" result="farShadow" />
          <feMerge><feMergeNode in="farShadow" /><feMergeNode in="nearShadow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {PIECES.map(piece => <Tickets key={piece.seed} id={id} piece={piece} game={game} prize={prize} draw={draw} />)}
    </svg>
  </span>
}
