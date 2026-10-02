import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createHash, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

const tabs = new Map()
function makeSheet(name) {
  const rows = []
  const sheet = {
    rows,
    getLastRow: () => rows.length,
    setFrozenRows() {},
    appendRow(row) { rows.push([...row]) },
    getRange(row, col, count = 1) {
      const range = {
        setValues(values) { values.forEach((valuesRow, i) => { rows[row - 1 + i] ??= []; valuesRow.forEach((value, j) => { rows[row - 1 + i][col - 1 + j] = value }) }); return range },
        setFontWeight() { return range },
        setValue(value) { rows[row - 1][col - 1] = value; return range },
        getValue() { return rows[row - 1]?.[col - 1] ?? '' },
        createTextFinder(value) {
          return { matchEntireCell: () => ({ findNext: () => {
            for (let i = row - 1; i < row - 1 + count; i++) if (rows[i]?.[col - 1] === value) return { getRow: () => i + 1 }
            return null
          } }) }
        },
      }
      return range
    },
  }
  tabs.set(name, sheet)
  return sheet
}
const signupSheet = makeSheet('Sheet1')
const messages = []
const cache = new Map()
const sharedSecret = 'test-only-shared-secret-more-than-32-characters'
let failMail = false
let locked = false
let releases = 0
const context = vm.createContext({
  SpreadsheetApp: {
    openById: () => ({ getSheetByName: name => tabs.get(name), insertSheet: name => makeSheet(name), getSheets: () => [...tabs.values()] }),
    flush() {},
  },
  MailApp: { sendEmail: message => { if (failMail) throw Error('Mail unavailable'); messages.push(message) } },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: () => sharedSecret }) },
  LockService: { getScriptLock: () => ({ tryLock: () => !locked, releaseLock: () => { releases++ } }) },
  CacheService: { getScriptCache: () => ({ get: key => cache.get(key), put: (key, value) => cache.set(key, value) }) },
  Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' }, computeDigest: (algorithm, value) => [...createHash(algorithm).update(value).digest()] },
  console: { error() {} },
})
vm.runInContext(readFileSync('google-apps-script/Code.gs', 'utf8'), context)
context.setupSheet()
const signup = { parameter: { action: 'signup', requestId: randomUUID(), secret: sharedSecret, name: 'Test Student', email: 'test@example.com', program: 'Engineering', year: '2nd year', phone: '', teamStatus: 'looking' } }
const first = context.doPost(signup)
assert.equal(first.result, 'success')
assert.equal(first.saved, true)
assert.equal(first.requestId, signup.parameter.requestId)
assert.equal(signupSheet.rows.length, 2)
assert.equal(messages.length, 1)
assert.equal(messages[0].to, 'test@example.com')
assert(messages[0].body.includes('https://www.hultprize.org/register'))
assert(messages[0].body.includes('https://signal.group/#CjQKIKs4d_yjcI_b8-HQDZOUCTPgrwHLO9afYy86-aIccZO2EhA2jvXrmEDUZ5fvaccFQciT'))
assert(messages[0].body.includes('not your competition entry'))
assert.equal(context.doPost(signup).result, 'success')
assert.equal(signupSheet.rows.length, 2, 'Retry must not append another row')
assert.equal(messages.length, 1, 'Retry must not repeat a completed notification')
assert.equal(context.doPost({ parameter: { ...signup.parameter, name: 'Changed name' } }).code, 'conflict')
assert.equal(signupSheet.rows.length, 2)

failMail = true
const second = { parameter: { ...signup.parameter, requestId: randomUUID() } }
assert.equal(context.doPost(second).result, 'success')
assert.equal(signupSheet.rows.length, 3, 'Mail failure must not discard a saved sign-up')
assert.equal(signupSheet.rows[2][9], '')
failMail = false
assert.equal(context.doPost(second).result, 'success')
assert.equal(signupSheet.rows.length, 3)
assert.equal(messages.length, 2, 'Retry attempts a pending confirmation without repeating the saved row')
assert(signupSheet.rows[2][9])

assert.equal(context.doPost({ parameter: { ...signup.parameter, email: 'invalid' } }).result, 'error')
assert.equal(context.doPost({ parameter: { ...signup.parameter, secret: 'invalid' } }).code, 'unauthorized')
assert.equal(context.doPost().result, 'error')
assert.equal(signupSheet.rows.length, 3)
locked = true
assert.equal(context.doPost(signup).code, 'busy')
locked = false
const enquiry = { parameter: { action: 'enquiry', requestId: randomUUID(), secret: sharedSecret, name: 'Partner Contact', email: 'partner@example.com', topic: 'partnership', message: '=HYPERLINK("https://example.com", "hello")' } }
assert.equal(context.doPost(enquiry).result, 'success')
const enquirySheet = tabs.get('Enquiries')
assert.equal(enquirySheet.rows.length, 2)
assert.equal(enquirySheet.rows[1][4][0], "'", 'Spreadsheet formula injection is neutralized')
assert.equal(messages.at(-1).to, 'hultprizeatuwindsor@gmail.com')
assert.equal(messages.at(-1).replyTo, 'partner@example.com')
assert(messages.at(-1).body.includes('Partner Contact'))
assert.equal(context.doPost(enquiry).result, 'success')
assert.equal(enquirySheet.rows.length, 2)
for (let i = 0; i < 4; i++) assert.equal(context.doPost({ parameter: { ...signup.parameter, requestId: randomUUID() } }).result, 'success')
assert.equal(context.doPost({ parameter: { ...signup.parameter, requestId: randomUUID() } }).code, 'rate_limited')
assert.equal(context.doPost(signup).result, 'success', 'Existing saved requests can be retried despite the email rate limit')
assert(releases >= 10, 'Locks must release after success, conflict, and rate limits')
assert.equal(context.doGet().version, 2)
console.log('Passed: Apps Script saved receipts, preserved confirmation links, authentication, validation, locks, idempotency, pending-mail retry, enquiry delivery, formula escaping, and per-email limits. No Google Sheet accessed or email sent.')
