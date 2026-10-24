import { createHmac, timingSafeEqual } from 'node:crypto'

const CATEGORIES = ['undergraduate', 'graduate', 'other-student', 'sponsor', 'founder', 'faculty', 'alumni', 'community']
const ADMIN_ACTIONS = new Set(['admin', 'saveEvent', 'checkIn', 'walkIn', 'retryEmail', 'sendUpdate', 'export'])
const MEMBER_ACTIONS = new Set(['manage', 'updateDetails', 'addEvents', 'cancel'])
const GET_ACTIONS = new Set(['events', 'manage', 'admin', 'export'])
const MAX_BODY = 20000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ID = /^[a-zA-Z0-9_-]{1,100}$/
const TOKEN = /^[a-f0-9]{64}$/

function text(value, max, required = false) {
  // Reject invisible control characters while allowing normal textarea line breaks.
  // eslint-disable-next-line no-control-regex
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return null
  const clean = value.trim()
  return required && !clean ? null : clean
}
function str(value, max) { return text(value ?? '', max) }
export function validateAttendee(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out = {}
  for (const key of ['firstName', 'lastName', 'email']) out[key] = text(value[key], key === 'email' ? 254 : 100, true)
  for (const key of ['institution', 'faculty', 'organisation', 'role', 'teamName', 'referral']) out[key] = str(value[key], 180)
  for (const key of ['dietary', 'accessibility']) out[key] = str(value[key], 1000)
  out.category = CATEGORIES.includes(value.category) ? value.category : null
  out.withTeam = value.withTeam === true || value.withTeam === 'yes'
  if (Object.values(out).includes(null) || !EMAIL.test(out.email) || /[\r\n]/.test(out.firstName + out.lastName + out.email)) return null
  out.email = out.email.toLowerCase()
  if (['undergraduate', 'graduate', 'other-student'].includes(out.category) && (!out.institution || !out.faculty)) return null
  if (out.category === 'sponsor' && !out.organisation) return null
  if (!out.withTeam) out.teamName = ''
  return out
}
function eventIds(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(id => typeof id === 'string' && ID.test(id)) ? [...new Set(value)] : null
}
export function validateEvent(value) {
  if (!value || typeof value !== 'object') return null
  const event = {}
  for (const key of ['id', 'title', 'venue', 'description', 'preparation']) event[key] = text(value[key] ?? '', key === 'id' ? 100 : 2000, key !== 'preparation')
  if (Object.values(event).includes(null) || !ID.test(event.id)) return null
  if (!['community', 'workshops', 'finale'].includes(value.group) || !['open', 'full', 'closed', 'cancelled', 'completed'].includes(value.status)) return null
  if (value.capacity !== null && (!Number.isSafeInteger(value.capacity) || value.capacity < 1 || value.capacity > 100000)) return null
  if (value.timeZone !== 'America/Toronto' || typeof value.allowLateRegistration !== 'boolean') return null
  if (![value.startsAt, value.endsAt].every(date => typeof date === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(date) && Number.isFinite(Date.parse(date))) || Date.parse(value.endsAt) <= Date.parse(value.startsAt)) return null
  return { ...event, group: value.group, status: value.status, capacity: value.capacity, timeZone: value.timeZone, allowLateRegistration: value.allowLateRegistration, startsAt: value.startsAt, endsAt: value.endsAt }
}
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const out = { action: body.action }
  switch (body.action) {
    case 'register': case 'walkIn':
      out.attendee = validateAttendee(body.attendee)
      out.eventIds = eventIds(body.eventIds)
      if (!out.attendee || !out.eventIds || body.consent !== true || typeof body.marketingConsent !== 'boolean' || body.website || !/^[a-f0-9-]{36}$/i.test(body.requestId ?? '')) return null
      return { ...out, consent: true, marketingConsent: body.marketingConsent, requestId: body.requestId }
    case 'requestLink':
      out.email = text(body.email, 254, true)?.toLowerCase()
      return out.email && EMAIL.test(out.email) && !body.website ? out : null
    case 'exchange': case 'acceptOffer': return typeof body.token === 'string' && TOKEN.test(body.token) ? { ...out, token: body.token } : null
    case 'updateDetails':
      out.dietary = str(body.dietary, 1000); out.accessibility = str(body.accessibility, 1000)
      return out.dietary !== null && out.accessibility !== null ? out : null
    case 'addEvents': return eventIds(body.eventIds) ? { ...out, eventIds: eventIds(body.eventIds) } : null
    case 'cancel': case 'checkIn': return ID.test(body.registrationId ?? '') ? { ...out, registrationId: body.registrationId } : null
    case 'saveEvent': return validateEvent(body.event) ? { ...out, event: validateEvent(body.event) } : null
    case 'retryEmail': return ID.test(body.deliveryId ?? '') ? { ...out, deliveryId: body.deliveryId } : null
    case 'sendUpdate': return ID.test(body.eventId ?? '') ? { ...out, eventId: body.eventId } : null
    case 'login': return text(body.password, 256, true) ? { ...out, password: body.password } : null
    case 'logout': return out
    default: return null
  }
}
function reply(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(JSON.stringify(body))
}
function equal(a, b) {
  const aa = Buffer.from(a || ''), bb = Buffer.from(b || '')
  return aa.length === bb.length && aa.length > 0 && timingSafeEqual(aa, bb)
}
function hmac(value, secret) { return createHmac('sha256', secret).update(value).digest('hex') }
export function createSession(claims, secret) {
  const value = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${value}.${hmac(value, secret)}`
}
function session(req, kind, secret, now) {
  const name = kind === 'admin' ? 'hult_attendance_admin' : 'hult_attendance_member'
  const cookie = String(req.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
  if (!cookie || cookie.length > 1500) return null
  const [value, signature] = cookie.split('.')
  if (!equal(signature, hmac(value, secret))) return null
  try {
    const result = JSON.parse(Buffer.from(value, 'base64url').toString())
    return result.kind === kind && Number.isFinite(result.exp) && result.exp > now && (kind === 'admin' ? ['admin', 'support'].includes(result.role) : ID.test(result.attendeeId)) ? result : null
  } catch { return null }
}
function cookie(req, kind, value, age) {
  const secure = !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(req.headers.host))
  return `hult_attendance_${kind === 'admin' ? 'admin' : 'member'}=${value}; HttpOnly; SameSite=Strict; Path=/api/attendance; Max-Age=${age}${secure ? '; Secure' : ''}`
}
async function readBody(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (Buffer.byteLength(raw) > MAX_BODY) throw Error('body')
    return typeof req.body === 'string' ? JSON.parse(raw) : req.body
  }
  let raw = ''
  for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > MAX_BODY) throw Error('body') }
  return JSON.parse(raw)
}
function safeCell(value) {
  let cell = String(value ?? '')
  if (/^[\s]*[=+\-@]/.test(cell) || /^[\t\r\n]/.test(cell)) cell = `'${cell}`
  return `"${cell.replaceAll('"', '""')}"`
}
export function rosterCsv(data, filters = {}) {
  const columns = ['Event', 'First name', 'Last name', 'Email', 'Category', 'Institution', 'Faculty', 'Organisation', 'Team', 'Status', 'Checked in at']
  const rows = data.registrations.filter(registration => {
    const a = data.attendees.find(item => item.id === registration.attendeeId) || {}
    return (!filters.eventIds || filters.eventIds.split(',').includes(registration.eventId)) && (!filters.category || a.category === filters.category) && (!filters.institution || a.institution === filters.institution) && (!filters.faculty || a.faculty === filters.faculty) && (!filters.team || (a.teamName || '').toLowerCase().includes(filters.team.toLowerCase())) && (!filters.status || registration.status === filters.status)
  }).map(registration => {
    const a = data.attendees.find(item => item.id === registration.attendeeId) || {}
    return [data.events.find(item => item.id === registration.eventId)?.title || registration.eventId, a.firstName, a.lastName, a.email, a.category, a.institution, a.faculty, a.organisation, a.teamName, registration.status, data.checkins.find(item => item.registrationId === registration.id)?.checkedInAt || '']
  })
  return '\uFEFF' + [columns, ...rows].map(row => row.map(safeCell).join(',')).join('\r\n') + '\r\n'
}
export async function handleAttendance(req, res, options = {}) {
  const env = options.env ?? process.env, now = options.now ?? Date.now()
  if (!['GET', 'POST'].includes(req.method)) return reply(res, 405, { ok: false, code: 'method_not_allowed' }, { Allow: 'GET, POST' })
  const url = new URL(req.url || '/api/attendance', 'http://localhost')
  let payload
  if (req.method === 'GET') {
    payload = { action: url.searchParams.get('action') || 'events' }
    if (!GET_ACTIONS.has(payload.action)) return reply(res, 405, { ok: false, code: 'method_not_allowed' })
  } else {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reply(res, 415, { ok: false, code: 'invalid_request' })
    try { const origin = new URL(req.headers.origin || ''); if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host) throw Error('origin') } catch { return reply(res, 403, { ok: false, code: 'invalid_origin' }) }
    try { payload = validate(await readBody(req)) } catch { payload = null }
    if (!payload) return reply(res, 400, { ok: false, code: 'invalid_request', message: 'Check the required fields and try again.' })
  }
  if (payload.action === 'logout') return reply(res, 200, { ok: true }, { 'Set-Cookie': [cookie(req, 'admin', '', 0), cookie(req, 'member', '', 0)] })
  const endpoint = env.ATTENDANCE_ENDPOINT || '', shared = env.ATTENDANCE_SHARED_SECRET || '', secret = env.ATTENDANCE_SESSION_SECRET || ''
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint) || shared.length < 32 || secret.length < 32) return reply(res, 503, { ok: false, code: 'unavailable', message: 'Event registration is not yet connected. Please try again later.' })
  const admin = session(req, 'admin', secret, now), member = session(req, 'member', secret, now)
  if (ADMIN_ACTIONS.has(payload.action) && !admin) return reply(res, 401, { ok: false, code: 'unauthorized' })
  if (MEMBER_ACTIONS.has(payload.action) && !member) return reply(res, 401, { ok: false, code: 'unauthorized', message: 'Request a new secure email link to manage your attendance.' })
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'unknown').split(',')[0].trim()
  const upstream = { ...payload, actor: ADMIN_ACTIONS.has(payload.action) ? { role: admin.role } : MEMBER_ACTIONS.has(payload.action) ? { attendeeId: member.attendeeId } : {}, clientKey: hmac(ip, shared) }
  if (payload.action === 'login') { upstream.action = 'rateCheck'; delete upstream.password; upstream.bucket = 'login' }
  if (payload.action === 'export') upstream.action = 'admin'
  try {
    const response = await (options.fetch ?? fetch)(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ secret: shared, payload: JSON.stringify(upstream) }).toString(), redirect: 'follow', signal: AbortSignal.timeout(25000) })
    if (!response.ok) throw Error('upstream')
    const receipt = await response.json()
    if (typeof receipt?.ok !== 'boolean') throw Error('receipt')
    if (!receipt.ok) {
      const codes = { invalid_request: 400, unauthorized: 401, invalid_token: 401, forbidden: 403, not_found: 404, conflict: 409, event_unavailable: 409, capacity_conflict: 409, rate_limited: 429, busy: 503, unavailable: 503 }
      return reply(res, codes[receipt.code] || 502, { ok: false, code: receipt.code || 'unconfirmed', ...(typeof receipt.message === 'string' ? { message: receipt.message } : {}) }, receipt.code === 'rate_limited' ? { 'Retry-After': '600' } : {})
    }
    if (payload.action === 'login') {
      const support = (env.ATTENDANCE_SUPPORT_PASSWORD || '').length >= 16 && equal(payload.password, env.ATTENDANCE_SUPPORT_PASSWORD)
      const ordinary = (env.ATTENDANCE_ADMIN_PASSWORD || '').length >= 16 && equal(payload.password, env.ATTENDANCE_ADMIN_PASSWORD)
      if (!support && !ordinary) return reply(res, 401, { ok: false, code: 'unauthorized', message: 'The organiser password was not recognised.' })
      const token = createSession({ kind: 'admin', role: support ? 'support' : 'admin', exp: now + 8 * 3600000 }, secret)
      return reply(res, 200, { ok: true, canViewSupport: support }, { 'Set-Cookie': cookie(req, 'admin', token, 8 * 3600) })
    }
    if (payload.action === 'register' && !(receipt.saved === true || receipt.verificationRequired === true)) throw Error('unconfirmed')
    const headers = {}
    if (['exchange', 'acceptOffer'].includes(payload.action)) {
      if (!ID.test(receipt.sessionAttendeeId || '')) throw Error('session')
      const token = createSession({ kind: 'member', attendeeId: receipt.sessionAttendeeId, exp: now + 7 * 86400000 }, secret)
      headers['Set-Cookie'] = cookie(req, 'member', token, 7 * 86400)
    }
    delete receipt.sessionAttendeeId
    if (payload.action === 'export') {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': 'attachment; filename="hult-event-roster.csv"', 'Referrer-Policy': 'no-referrer' })
      return res.end(rosterCsv(receipt, Object.fromEntries(url.searchParams)))
    }
    return reply(res, 200, receipt, headers)
  } catch {
    return reply(res, 502, { ok: false, code: 'unconfirmed', message: 'We could not confirm the response. Retry safely; an existing registration will not be duplicated.' })
  }
}
