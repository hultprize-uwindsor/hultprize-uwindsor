import { createHash } from 'node:crypto'

const MAX_BODY_BYTES = 12_000
const WINDOW_MS = 10 * 60 * 1000
const attempts = new Map()
const YEAR_OPTIONS = ['1st year', '2nd year', '3rd year', '4th year+', "Master's", 'PhD', 'Other']
const TOPICS = ['general', 'competing', 'partnership', 'mentoring', 'media']

function reply(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

function field(value, max) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : ''
}

export function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const common = {
    action: body.action,
    requestId: field(body.requestId, 64),
    name: field(body.name, 120),
    email: field(body.email, 254).toLowerCase(),
  }
  if (!/^[a-f0-9-]{36}$/.test(common.requestId) || !common.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(common.email)) return null
  if (body.website || /[\r\n]/.test(common.name + common.email)) return null
  if (body.action === 'signup') {
    const program = field(body.program, 160)
    const phone = field(body.phone ?? '', 40)
    if (!program || !YEAR_OPTIONS.includes(body.year) || !['yes', 'no', 'looking'].includes(body.teamStatus)) return null
    if (typeof body.phone !== 'string' || body.phone.length > 40) return null
    return { ...common, program, year: body.year, phone, teamStatus: body.teamStatus }
  }
  if (body.action === 'enquiry') {
    const message = field(body.message, 4000)
    if (!TOPICS.includes(body.topic) || message.length < 10) return null
    return { ...common, topic: body.topic, message }
  }
  return null
}

async function readBody(req) {
  // Vercel parses JSON ahead of the handler; Vite supplies an IncomingMessage.
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error('too_large')
    return typeof req.body === 'string' ? JSON.parse(raw) : req.body
  }
  let raw = ''
  for await (const chunk of req) {
    raw += chunk.toString()
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error('too_large')
  }
  return JSON.parse(raw)
}

function limitReached(req, now) {
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key)
  // This is a best-effort per-instance throttle. Apps Script also limits by email.
  const address = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim()
  const key = createHash('sha256').update(address).digest('hex')
  const entry = attempts.get(key) ?? { count: 0, expires: now + WINDOW_MS }
  entry.count += 1
  attempts.set(key, entry)
  return entry.count > 8
}

export async function handleForms(req, res, options = {}) {
  const env = options.env ?? process.env
  const fetchUpstream = options.fetch ?? fetch
  if (req.method !== 'POST') return reply(res, 405, { ok: false, code: 'method_not_allowed' }, { Allow: 'POST' })
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return reply(res, 415, { ok: false, code: 'invalid_request' })
  // Same-origin browser submissions only. Never expose the Apps Script URL or key.
  try {
    const origin = new URL(String(req.headers.origin ?? ''))
    if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host) throw new Error('origin')
  } catch {
    return reply(res, 403, { ok: false, code: 'invalid_origin' })
  }
  let body
  try { body = await readBody(req) } catch { return reply(res, 400, { ok: false, code: 'invalid_request' }) }
  const payload = validateSubmission(body)
  if (!payload) return reply(res, 400, { ok: false, code: 'invalid_request' })
  if (limitReached(req, options.now ?? Date.now())) return reply(res, 429, { ok: false, code: 'rate_limited' }, { 'Retry-After': '600' })

  const endpoint = env.FORM_ENDPOINT ?? ''
  const secret = env.FORM_SHARED_SECRET ?? ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) || secret.length < 32) {
    return reply(res, 503, { ok: false, code: 'unavailable' })
  }
  try {
    const response = await fetchUpstream(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...payload, secret, source: 'uwindsor-hultprize-site' }).toString(),
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    })
    if (!response.ok) throw new Error('upstream')
    const receipt = await response.json()
    if (receipt.result === 'success' && receipt.saved === true && receipt.requestId === payload.requestId) {
      return reply(res, 200, { ok: true, saved: true, requestId: payload.requestId })
    }
    if (receipt.code === 'conflict') return reply(res, 409, { ok: false, code: 'conflict' })
    if (receipt.code === 'rate_limited') return reply(res, 429, { ok: false, code: 'rate_limited' }, { 'Retry-After': '600' })
    throw new Error('unconfirmed')
  } catch {
    // A timeout may follow a successful save. The same request ID makes retry safe.
    return reply(res, 502, { ok: false, code: 'unconfirmed' })
  }
}
