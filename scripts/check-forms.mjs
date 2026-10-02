import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { randomUUID } from 'node:crypto'
import { handleForms, validateSubmission } from '../server/forms.js'

const valid = { action: 'signup', requestId: randomUUID(), name: 'Test Student', email: 'test@example.com', program: 'Engineering', year: '2nd year', phone: '', teamStatus: 'looking', website: '' }
const env = { FORM_ENDPOINT: 'https://script.google.com/macros/s/testdeployment/exec', FORM_SHARED_SECRET: 'test-only-shared-secret-more-than-32-characters' }
let sequence = 0
let sends = 0
const calls = []
async function invoke(body = valid, options = {}) {
  const req = Readable.from([JSON.stringify(body)])
  req.method = options.method ?? 'POST'
  req.headers = { 'content-type': 'application/json', origin: 'http://localhost:5173', host: 'localhost:5173', 'x-forwarded-for': 'test-' + sequence++, ...options.headers }
  if (options.parsed) req.body = body
  const result = {}
  const res = { writeHead(status, headers) { result.status = status; result.headers = headers }, end(text) { result.body = JSON.parse(text) } }
  await handleForms(req, res, { env, fetch: async (url, init) => {
    sends++
    calls.push({ url, init })
    return { ok: true, json: async () => ({ result: 'success', saved: true, requestId: body.requestId }) }
  }, ...options.settings })
  return result
}

assert(validateSubmission(valid))
for (const fields of [{ action: 'unknown' }, { email: 'invalid' }, { year: '999' }, { name: 'x'.repeat(121) }, { phone: 'x'.repeat(41) }, { requestId: 'no-id' }, { website: 'spam' }, { name: 'Name\nHeader' }]) assert.equal(validateSubmission({ ...valid, ...fields }), null)
assert.equal((await invoke({}, { method: 'GET' })).status, 405)
assert.equal((await invoke(valid, { headers: { origin: 'https://other.example' } })).status, 403)
assert.equal((await invoke(valid, { headers: { 'content-type': 'text/plain' } })).status, 415)
assert.equal((await invoke({ ...valid, website: 'spam' })).status, 400)
assert.equal((await invoke({ ...valid, name: 'x'.repeat(13000) })).status, 400)
assert.equal(sends, 0, 'Rejected input must never reach the upstream service')

const unconfigured = await invoke(valid, { settings: { env: {} } })
assert.equal(unconfigured.status, 503)
assert.equal(unconfigured.body.ok, false)
assert.equal(sends, 0)
const unsupported = await invoke(valid, { settings: { env: { ...env, FORM_ENDPOINT: 'https://example.com/exec' } } })
assert.equal(unsupported.status, 503, 'Only the intended Apps Script host is allowed')

const success = await invoke()
assert.equal(success.status, 200)
assert.equal(success.body.saved, true)
assert.equal(success.body.requestId, valid.requestId)
assert(!JSON.stringify(success).includes(env.FORM_SHARED_SECRET))
assert(!JSON.stringify(success).includes(env.FORM_ENDPOINT))
assert.equal(new URLSearchParams(calls[0].init.body).get('secret'), env.FORM_SHARED_SECRET)
assert.equal(new URLSearchParams(calls[0].init.body).get('requestId'), valid.requestId)
assert.equal((await invoke(valid, { parsed: true })).status, 200, 'Vercel parsed bodies work too')

for (const receipt of [{ result: 'success' }, { result: 'success', saved: true, requestId: 'wrong-id' }, { result: 'error' }]) {
  const result = await invoke(valid, { settings: { fetch: async () => ({ ok: true, json: async () => receipt }) } })
  assert.equal(result.status, 502)
  assert.equal(result.body.ok, false, 'An unverified response must never show success')
}
assert.equal((await invoke(valid, { settings: { fetch: async () => { throw Error('Timeout') } } })).status, 502)
assert.equal((await invoke(valid, { settings: { fetch: async () => ({ ok: false }) } })).status, 502)
assert.equal((await invoke(valid, { settings: { fetch: async () => ({ ok: true, json: async () => { throw Error('HTML instead of JSON') } }) } })).status, 502)
assert.equal((await invoke(valid, { settings: { fetch: async () => ({ ok: true, json: async () => ({ code: 'conflict' }) }) } })).status, 409)
const enquiry = { action: 'enquiry', requestId: randomUUID(), name: 'Test Partner', email: 'partner@example.com', topic: 'partnership', message: 'We would like to discuss the programme.', website: '' }
assert.equal((await invoke(enquiry)).status, 200)
assert.equal(validateSubmission({ ...enquiry, message: 'short' }), null)
assert.equal(validateSubmission({ ...enquiry, topic: 'unknown' }), null)
for (let i = 0; i < 8; i++) assert.equal((await invoke(valid, { headers: { 'x-forwarded-for': 'rate-test' } })).status, 200)
assert.equal((await invoke(valid, { headers: { 'x-forwarded-for': 'rate-test' } })).status, 429)
console.log('Passed: server validation, origin checks, limits, config protection, verified receipts, timeout/error handling, Vercel/Vite request formats, and enquiries. All upstream calls mocked.')
