import { useEffect, useRef } from 'react'
import './PrizeCoins.css'

type Coin = {
  x: number; y: number; vx: number; vy: number; radius: number; size: number
  angle: number; turn: number; spin: number; tumble: number; delay: number; finish: number
}
type CoinState = 'waiting' | 'falling' | 'settled' | 'still'
const TAU = Math.PI * 2
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** Original, reusable coin faces. No images, fonts or artwork are downloaded. */
function makeFace(champagne: boolean) {
  const face = document.createElement('canvas')
  face.width = face.height = 224
  const ctx = face.getContext('2d')!
  const c = 112
  const outer = ctx.createLinearGradient(30, 20, 192, 204)
  outer.addColorStop(0, '#fff8d8')
  outer.addColorStop(.22, champagne ? '#ecd49b' : '#fbd978')
  outer.addColorStop(.5, '#a56515')
  outer.addColorStop(.7, '#e5b953')
  outer.addColorStop(1, '#795018')
  ctx.fillStyle = outer
  ctx.beginPath(); ctx.arc(c, c, 105, 0, TAU); ctx.fill()
  ctx.strokeStyle = '#fff1bc'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(c, c, 99, 0, TAU); ctx.stroke()
  for (let i = 0; i < 80; i++) {
    const angle = i / 80 * TAU
    ctx.strokeStyle = i % 2 ? '#fff4c685' : '#8455208c'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(angle) * 92, c + Math.sin(angle) * 92)
    ctx.lineTo(c + Math.cos(angle) * 99, c + Math.sin(angle) * 99)
    ctx.stroke()
  }
  const field = ctx.createLinearGradient(43, 30, 177, 193)
  field.addColorStop(0, champagne ? '#fff8df' : '#fff1b3')
  field.addColorStop(.38, champagne ? '#e9cd91' : '#ecca64')
  field.addColorStop(.62, champagne ? '#d0a55d' : '#cf9831')
  field.addColorStop(1, champagne ? '#f5deb0' : '#f2d480')
  ctx.fillStyle = field
  ctx.beginPath(); ctx.arc(c, c, 88, 0, TAU); ctx.fill()
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#a0712b'
  ctx.beginPath(); ctx.arc(c, c, 88, .12, Math.PI * 1.1); ctx.stroke()
  ctx.strokeStyle = '#fff6cd'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(c, c, 86, Math.PI * 1.1, TAU + .12); ctx.stroke()
  ctx.font = 'bold 128px Georgia, serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#986527'; ctx.fillText('$', c + 2, c + 10)
  ctx.fillStyle = '#fff6cf'; ctx.fillText('$', c - 1, c + 6)
  const stamp = ctx.createLinearGradient(75, 60, 143, 176)
  stamp.addColorStop(0, '#edcc7c'); stamp.addColorStop(.5, '#b7822f'); stamp.addColorStop(1, '#e2b764')
  ctx.fillStyle = stamp; ctx.fillText('$', c, c + 8)
  return face
}

/** Coins are decoration; the fixed prize remains ordinary HTML. */
export default function PrizeCoins() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = canvas?.closest<HTMLElement>('.global-prize')
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !section) return
    const title = section.querySelector<HTMLElement>('#global-prize-title')
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const faces = [makeFace(false), makeFace(true)]
    let disposed = false
    let frame = 0
    let layoutFrame = 0
    let width = 0
    let height = 0
    let pixelRatio = 0
    let coins: Coin[] = []
    let visible = false
    let armed = true
    let elapsed = 0
    let previousTime = 0
    let run = 0
    let state: CoinState = 'waiting'
    let dragged: Coin | null = null
    let pointer: { x: number; y: number; time: number; id: number } | null = null

    function setState(next: CoinState) {
      state = next
      canvas!.dataset.coinState = next
    }
    function baseRadius() {
      return width <= 800 ? clamp(width / 24, 13, 24) : clamp(width / 34, 27, 43)
    }
    function draw() {
      context!.clearRect(0, 0, width, height)
      for (const coin of coins) {
        if (coin.delay > elapsed && state !== 'still') continue
        const aspect = .25 + .75 * Math.abs(Math.cos(coin.turn))
        const size = coin.radius * 2
        context!.save()
        context!.translate(coin.x, coin.y)
        context!.rotate(coin.angle)
        // The dark bevel remains visible as the face turns edge-on.
        context!.fillStyle = '#8b591d'
        context!.beginPath()
        context!.ellipse(2.2, 2.5, coin.radius * aspect, coin.radius, 0, 0, TAU)
        context!.fill()
        context!.scale(aspect, 1)
        context!.drawImage(faces[coin.finish], -coin.radius, -coin.radius, size, size)
        const shine = context!.createLinearGradient(-coin.radius, -coin.radius, coin.radius, coin.radius)
        shine.addColorStop(0, `rgba(255,255,240,${.07 + Math.abs(Math.sin(coin.turn)) * .16})`)
        shine.addColorStop(.45, 'rgba(255,255,240,0)')
        shine.addColorStop(1, 'rgba(84,46,8,.1)')
        context!.fillStyle = shine
        context!.beginPath(); context!.arc(0, 0, coin.radius * .94, 0, TAU); context!.fill()
        context!.restore()
      }
    }
    function stop() {
      cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
    }
    function makeCoins(still = false) {
      const radius = baseRadius()
      const count = width <= 800 ? Math.min(22, Math.max(13, Math.floor(width / 24))) : Math.min(46, Math.floor(width / 31))
      coins = Array.from({ length: count }, (_, i) => {
        const size = .84 + ((i * .31) % .32)
        const r = radius * size
        return {
          x: r + ((i * 277.73 + run * 83) % Math.max(1, width - r * 2)),
          y: -r - (i % 5) * radius * .9,
          vx: Math.sin(i * 8.7 + run) * (width <= 800 ? 35 : 145), vy: 40,
          radius: r, size, angle: Math.sin(i * 4.7) * .8,
          turn: i * 1.77, spin: Math.sin(i * 3.2) * 2.2,
          tumble: .9 + (i % 4) * .28, delay: (i % 9) * .075, finish: i % 3 === 0 ? 1 : 0,
        }
      })
      if (still) {
        const columns = Math.max(1, Math.floor(width / (radius * 2.13)))
        coins.forEach((coin, index) => {
          const row = Math.floor(index / columns)
          coin.x = radius * 1.1 + (index % columns) * (width - radius * 2.2) / Math.max(1, columns - 1)
          coin.y = height - coin.radius - row * radius * 1.64
          coin.turn = .1 + (index % 4) * .18
          coin.delay = 0
        })
      }
    }
    function begin() {
      if (!armed || !width || !height || motion.matches || disposed) return
      armed = false
      elapsed = 0
      run += 1
      canvas!.dataset.coinRun = String(run)
      makeCoins()
      setState('falling')
      draw()
      start()
    }
    function releasePointer() {
      const pointerId = pointer?.id
      dragged = null
      pointer = null
      canvas!.style.cursor = 'auto'
      if (pointerId !== undefined && canvas!.hasPointerCapture(pointerId)) canvas!.releasePointerCapture(pointerId)
    }
    function checkPosition() {
      if (disposed) return
      // Reconcile directly too: a media preference can change between event delivery
      // and a frame/resize callback, including during StrictMode's effect setup.
      if (motion.matches !== (state === 'still')) { syncMotion(); return }
      const rect = section!.getBoundingClientRect()
      visible = rect.top < innerHeight && rect.bottom > 0
      if (!visible || document.hidden) stop()
      if (motion.matches) return
      const margin = Math.max(80, innerHeight * .12)
      const fullyAway = rect.bottom < -margin || rect.top > innerHeight + margin
      if (fullyAway && !armed) {
        stop()
        releasePointer()
        armed = true
        coins = []
        elapsed = 0
        setState('waiting')
        draw()
      }
      if (visible && !document.hidden) {
        const trigger = title?.getBoundingClientRect().top ?? rect.top
        if (armed && trigger <= innerHeight * .7) begin()
        else start()
      }
    }
    function measure() {
      if (disposed) return
      layoutFrame = 0
      const previousWidth = width
      const previousHeight = height
      const nextWidth = section!.clientWidth
      const nextHeight = section!.clientHeight
      const ratio = Math.min(devicePixelRatio || 1, 2)
      const resized = nextWidth !== width || nextHeight !== height || ratio !== pixelRatio
      width = nextWidth
      height = nextHeight
      if (!width || !height) return
      if (resized) {
        pixelRatio = ratio
        canvas!.width = Math.round(width * ratio)
        canvas!.height = Math.round(height * ratio)
        context!.setTransform(ratio, 0, 0, ratio, 0, 0)
        if (state === 'still') makeCoins(true)
        else if (previousWidth && (previousWidth <= 800) !== (width <= 800)) {
          stop()
          releasePointer()
          coins = []
          elapsed = 0
          armed = true
          setState('waiting')
        } else if (previousWidth && previousHeight) coins.forEach(coin => {
          coin.radius = baseRadius() * coin.size
          coin.x = clamp(coin.x * width / previousWidth, coin.radius, width - coin.radius)
          coin.y = Math.min(height - coin.radius, coin.y * height / previousHeight)
        })
      }
      if (resized) draw()
      checkPosition()
    }
    function queueMeasure() {
      if (!layoutFrame && !disposed) layoutFrame = requestAnimationFrame(measure)
    }
    function step(delta: number) {
      for (const coin of coins) {
        if (coin === dragged || coin.delay > elapsed) continue
        coin.vy += 1700 * delta
        coin.vx *= Math.pow(.991, delta * 60)
        coin.x += coin.vx * delta
        coin.y += coin.vy * delta
        coin.angle += coin.spin * delta + coin.vx * delta * .0015
        coin.turn += coin.tumble * delta
        if (coin.x < coin.radius) { coin.x = coin.radius; coin.vx = Math.abs(coin.vx) * .55 }
        if (coin.x > width - coin.radius) { coin.x = width - coin.radius; coin.vx = -Math.abs(coin.vx) * .55 }
        if (coin.y > height - coin.radius - 3) {
          coin.y = height - coin.radius - 3
          coin.vy = Math.abs(coin.vy) < 36 ? 0 : -Math.abs(coin.vy) * .38
          coin.vx *= .94
          coin.spin *= .89
          coin.tumble *= .88
        }
      }
      for (let i = 0; i < coins.length; i++) {
        const a = coins[i]
        if (a.delay > elapsed) continue
        for (let j = i + 1; j < coins.length; j++) {
          const b = coins[j]
          if (b.delay > elapsed) continue
          const dx = b.x - a.x, dy = b.y - a.y
          const distance = Math.hypot(dx, dy)
          const overlap = a.radius + b.radius - distance
          if (overlap <= 0 || distance < .001) continue
          const nx = dx / distance, ny = dy / distance
          const weightA = a === dragged ? 0 : b.radius ** 2 / (a.radius ** 2 + b.radius ** 2)
          const weightB = b === dragged ? 0 : a === dragged ? 1 : 1 - weightA
          const shiftA = b === dragged ? 1 : weightA
          if (a !== dragged) { a.x -= nx * overlap * shiftA; a.y -= ny * overlap * shiftA }
          if (b !== dragged) { b.x += nx * overlap * weightB; b.y += ny * overlap * weightB }
          const velocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (velocity < 0) {
            const impulse = -1.32 * velocity
            if (a !== dragged) { a.vx -= impulse * nx * shiftA; a.vy -= impulse * ny * shiftA; a.spin *= .99; a.tumble *= .985 }
            if (b !== dragged) { b.vx += impulse * nx * weightB; b.vy += impulse * ny * weightB; b.spin *= .99; b.tumble *= .985 }
          }
        }
      }
    }
    function animate(time: number) {
      frame = 0
      if (disposed) return
      if (motion.matches !== (state === 'still')) { syncMotion(); return }
      if (!visible || document.hidden || motion.matches || state !== 'falling') return
      const delta = Math.min((time - previousTime) / 1000 || 1 / 60, 1 / 30)
      previousTime = time
      elapsed += delta
      step(delta / 2)
      step(delta / 2)
      draw()
      const energy = coins.reduce((sum, coin) => sum + Math.abs(coin.vx) + Math.abs(coin.vy), 0) / Math.max(1, coins.length)
      if (!dragged && (elapsed > 9 || elapsed > 5.5 && energy < 24)) {
        setState('settled')
        coins.forEach(coin => { coin.vx = 0; coin.vy = 0; coin.spin = 0; coin.tumble = 0 })
        return
      }
      frame = requestAnimationFrame(animate)
    }
    function start() {
      if (frame || !visible || document.hidden || disposed || motion.matches || state !== 'falling') return
      previousTime = performance.now()
      frame = requestAnimationFrame(animate)
    }
    function syncMotion() {
      stop()
      releasePointer()
      if (motion.matches) {
        setState('still')
        makeCoins(true)
        draw()
      } else {
        coins = []
        armed = true
        setState('waiting')
        draw()
      }
      measure()
    }
    function pointerPosition(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height, time: performance.now(), id: event.pointerId }
    }
    function coinAt(x: number, y: number) {
      return coins.findLast(coin => coin.delay <= elapsed && Math.hypot((coin.x - x) / (.25 + .75 * Math.abs(Math.cos(coin.turn))), coin.y - y) <= coin.radius)
    }
    function pointerDown(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || motion.matches || armed) return
      const point = pointerPosition(event)
      const coin = coinAt(point.x, point.y)
      if (!coin) return
      dragged = coin
      pointer = point
      canvas!.setPointerCapture(event.pointerId)
      canvas!.style.cursor = 'grabbing'
      elapsed = Math.max(1, ...coins.map(item => item.delay))
      setState('falling')
      start()
    }
    function pointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      const point = pointerPosition(event)
      if (dragged && pointer) {
        const seconds = Math.max((point.time - pointer.time) / 1000, .016)
        dragged.vx = clamp((point.x - pointer.x) / seconds, -950, 950)
        dragged.vy = clamp((point.y - pointer.y) / seconds, -950, 950)
        dragged.x = clamp(point.x, dragged.radius, width - dragged.radius)
        dragged.y = clamp(point.y, dragged.radius, height - dragged.radius)
        dragged.spin = dragged.vx * .004
        dragged.tumble = .65
        pointer = point
      } else canvas!.style.cursor = !motion.matches && coinAt(point.x, point.y) ? 'grab' : 'auto'
    }
    function pointerUp() {
      if (!dragged) return
      releasePointer()
      elapsed = Math.max(1, ...coins.map(item => item.delay))
      start()
    }
    function visibilityChanged() {
      if (document.hidden) { stop(); releasePointer() }
      else { measure(); checkPosition() }
    }

    canvas.dataset.coinRun = '0'
    const resizeObserver = new ResizeObserver(queueMeasure)
    resizeObserver.observe(section)
    if (title) resizeObserver.observe(title)
    if (section.parentElement) resizeObserver.observe(section.parentElement)
    const observer = new IntersectionObserver(checkPosition, { threshold: [0, .1, .5, 1] })
    observer.observe(section)
    window.addEventListener('scroll', checkPosition, { passive: true })
    window.addEventListener('resize', queueMeasure, { passive: true })
    document.addEventListener('visibilitychange', visibilityChanged)
    document.fonts.addEventListener('loadingdone', queueMeasure)
    motion.addEventListener('change', syncMotion)
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('pointercancel', pointerUp)
    canvas.addEventListener('lostpointercapture', pointerUp)
    syncMotion()
    void document.fonts.ready.then(() => { if (!disposed) measure() })
    return () => {
      disposed = true
      stop()
      cancelAnimationFrame(layoutFrame)
      releasePointer()
      resizeObserver.disconnect()
      observer.disconnect()
      window.removeEventListener('scroll', checkPosition)
      window.removeEventListener('resize', queueMeasure)
      document.removeEventListener('visibilitychange', visibilityChanged)
      document.fonts.removeEventListener('loadingdone', queueMeasure)
      motion.removeEventListener('change', syncMotion)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointercancel', pointerUp)
      canvas.removeEventListener('lostpointercapture', pointerUp)
    }
  }, [])

  return <canvas ref={canvasRef} className="prize-coins" data-coin-state="waiting" data-coin-run="0" aria-hidden="true" />
}
