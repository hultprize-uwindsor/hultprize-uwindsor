import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) })
const base = process.env.CHECK_BASE_URL || 'http://127.0.0.1:5173'
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
// This test never allows a real form request to leave the browser.
const payloads = []
let responseMode = 'unconfirmed'
await page.route('**/api/forms', async route => {
  const payload = route.request().postDataJSON()
  payloads.push(payload)
  const response = responseMode === 'success'
    ? { status: 200, body: { ok: true, saved: true, requestId: payload.requestId } }
    : responseMode === 'unavailable'
      ? { status: 503, body: { ok: false, code: 'unavailable' } }
      : { status: 200, body: { ok: true } }
  await route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) })
})
try {
  await page.goto(base + '/compete#signup')
  const signup = page.locator('.signup-form')
  await signup.locator('button[type="submit"]').click()
  await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'name')
  assert.equal(payloads.length, 0, 'Invalid fields are not submitted')
  await signup.locator('input[name="name"]').fill('Test Student')
  await signup.locator('input[name="email"]').fill('student@example.com')
  await signup.locator('input[name="program"]').fill('Engineering')
  await signup.locator('select').selectOption('2nd year')
  await signup.locator('input[type="radio"][value="looking"]').check()
  await signup.locator('button[type="submit"]').click()
  await signup.getByRole('alert').waitFor()
  assert.match(await signup.getByRole('alert').textContent(), /could not confirm/)
  assert.equal(await page.locator('.signup-success').count(), 0, 'Unverified receipt must not render success')
  responseMode = 'success'
  await signup.locator('button[type="submit"]').click()
  await page.locator('.signup-success').waitFor()
  assert.equal(payloads[0].requestId, payloads[1].requestId, 'Unchanged retry reuses the ID')
  await page.waitForFunction(() => document.activeElement?.tagName === 'H3')
  assert.match(await page.locator('.signup-success').textContent(), /official|Official/)

  await page.goto(base + '/contact?enquiry=partnership')
  const enquiry = page.locator('.enquiry-form')
  await enquiry.waitFor()
  assert.equal(await enquiry.locator('select').inputValue(), 'partnership')
  await enquiry.locator('button[type="submit"]').click()
  await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'name')
  assert.equal(payloads.length, 2)
  await enquiry.locator('input[name="name"]').fill('Test Partner')
  await enquiry.locator('input[name="email"]').fill('partner@example.com')
  await enquiry.locator('textarea').fill('We would like to discuss supporting the programme.')
  responseMode = 'unavailable'
  await enquiry.locator('button[type="submit"]').click()
  await enquiry.getByRole('alert').waitFor()
  assert.match(await enquiry.getByRole('alert').textContent(), /unavailable/)
  assert.equal(await enquiry.getByRole('alert').locator('a[href^="mailto:"]').count(), 1)
  responseMode = 'success'
  await enquiry.locator('button[type="submit"]').click()
  await page.locator('.enquiry-success').waitFor()
  assert.equal(payloads[2].requestId, payloads[3].requestId)
  assert.equal(payloads[3].action, 'enquiry')
  assert.equal(payloads[3].topic, 'partnership')
  await page.waitForFunction(() => document.activeElement?.tagName === 'H3')
  console.log('Passed: signup and enquiry validation, focus, unverified receipt rejection, honest unavailable message, retry IDs, topic selection and success. Form requests intercepted; no real submissions.')
} finally {
  await browser.close()
}
