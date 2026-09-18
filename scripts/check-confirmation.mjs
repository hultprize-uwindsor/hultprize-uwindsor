import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'

const rows = []
const messages = []
let failMail = false
const context = vm.createContext({
  SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({ appendRow: row => rows.push(row) }) }) },
  MailApp: { sendEmail: message => { if (failMail) throw Error('Mail unavailable'); messages.push(message) } },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
  console: { error() {} },
})
vm.runInContext(readFileSync('google-apps-script/Code.gs', 'utf8'), context)
const signup = { parameter: { name: 'Test Student', email: 'test@example.com', program: 'Engineering', year: '2nd year', teamStatus: 'looking' } }
assert.equal(context.doPost(signup).result, 'success')
assert.equal(rows.length, 1)
assert.equal(messages.length, 1)
assert.equal(messages[0].to, 'test@example.com')
assert(messages[0].body.includes('https://www.hultprize.org/register'))
assert(messages[0].body.includes('https://signal.group/#CjQKIKs4d_yjcI_b8-HQDZOUCTPgrwHLO9afYy86-aIccZO2EhA2jvXrmEDUZ5fvaccFQciT'))
assert(messages[0].body.includes('not your competition entry'))
failMail = true
assert.equal(context.doPost(signup).result, 'success')
assert.equal(rows.length, 2, 'Mail failure must not discard a saved sign-up')
assert.equal(context.doPost({ parameter: { name: 'Test', email: 'invalid' } }).result, 'error')
assert.equal(context.doPost().result, 'error')
assert.equal(rows.length, 2)
console.log('Passed: saved sign-up, confirmation links, invalid input, and mail-failure handling. No email sent.')
