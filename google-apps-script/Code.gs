/**
 * Hult Prize @ UWindsor interest and enquiry form backend.
 *
 * Upgrade the existing standalone Apps Script project; keep the current Sheet.
 * 1. Paste this file into Code.gs. Run setupSheet once to extend signup headers
 *    and create the Enquiries tab. Existing response rows remain untouched.
 * 2. In Project settings > Script properties, add FORM_SHARED_SECRET with at
 *    least 32 random characters. Add the same value to the site's server env.
 * 3. Deploy a NEW VERSION of the existing web app: execute as Me, Anyone access.
 * 4. Set server-only FORM_ENDPOINT to that deployment's /exec URL, and
 *    FORM_SHARED_SECRET in .env.local / Vercel. Never prefix either with VITE_.
 *
 * The browser uses /api/forms. This endpoint accepts authenticated server
 * requests and returns a receipt only after the submission is saved.
 * See docs/forms.md for migration and testing instructions.
 */

const SHEET_ID = '1-XbLak_hLNsE6HDafRqcL0iuQBeAUxQ1KRTHRSXFHLQ';
const SHEET_NAME = 'Sheet1';
const TEAM_EMAIL = 'hultprizeatuwindsor@gmail.com';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Program', 'Year', 'Phone', 'Team Status', 'Request ID', 'Payload Hash', 'Notification Sent'];
const ENQUIRY_HEADERS = ['Timestamp', 'Name', 'Email', 'Topic', 'Message', 'Request ID', 'Payload Hash', 'Notification Sent'];
const YEARS = ['1st year', '2nd year', '3rd year', '4th year+', "Master's", 'PhD', 'Other'];
const TOPICS = ['general', 'competing', 'partnership', 'mentoring', 'media'];

function getSheet_(action) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (action === 'enquiry') return ss.getSheetByName('Enquiries') || ss.insertSheet('Enquiries');
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

/** Run once manually. This writes headers only, never clears existing rows. */
function setupSheet() {
  ['signup', 'enquiry'].forEach(function(action) {
    const sheet = getSheet_(action);
    const headers = action === 'enquiry' ? ENQUIRY_HEADERS : HEADERS;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function digest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
}

function text_(value, max) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
}

function validate_(params) {
  const value = {
    action: params.action,
    requestId: text_(params.requestId, 64),
    name: text_(params.name, 120),
    email: text_(params.email, 254).toLowerCase(),
  };
  if (!/^[a-f0-9-]{36}$/.test(value.requestId) || !value.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return null;
  if (params.website || /[\r\n]/.test(value.name + value.email)) return null;
  if (value.action === 'signup') {
    value.program = text_(params.program, 160);
    value.year = params.year;
    value.phone = text_(params.phone || '', 40);
    value.teamStatus = params.teamStatus;
    if (!value.program || YEARS.indexOf(value.year) < 0 || ['yes', 'no', 'looking'].indexOf(value.teamStatus) < 0 || String(params.phone || '').length > 40) return null;
  } else if (value.action === 'enquiry') {
    value.topic = params.topic;
    value.message = text_(params.message, 4000);
    if (TOPICS.indexOf(value.topic) < 0 || value.message.length < 10) return null;
  } else return null;
  return value;
}

/** Keep user-provided text from becoming a spreadsheet formula. */
function cell_(value) {
  return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
}

function notify_(params) {
  if (params.action === 'enquiry') {
    MailApp.sendEmail({
      to: TEAM_EMAIL,
      replyTo: params.email,
      name: 'Hult Prize website',
      subject: 'Website enquiry: ' + params.topic,
      body: ['From: ' + params.name, 'Email: ' + params.email, 'Topic: ' + params.topic, params.message].join('\n\n'),
    });
    return;
  }
  MailApp.sendEmail({
    to: params.email,
    subject: 'You’re on the Hult Prize UWindsor list',
    name: 'Hult Prize at the University of Windsor',
    replyTo: TEAM_EMAIL,
    body: [
      'Thanks for signing up. We will keep you posted on deadlines, workshops and team matching.',
      'This is a mailing-list sign-up, not your competition entry. Register officially at https://www.hultprize.org/register. This is the only registration that counts toward the competition.',
      'Registration closes November 20. The Grand Finale is February 5, 2027.',
      'Join the registered teams chat: https://signal.group/#CjQKIKs4d_yjcI_b8-HQDZOUCTPgrwHLO9afYy86-aIccZO2EhA2jvXrmEDUZ5fvaccFQciT',
      'Looking for a team? Join the mixer chat: https://signal.group/#CjQKIDgWmVxurnfxm-CnNUj-p6FY82u5bDTTlh0RSWC1Ag9xEhAqSS4Wby7U4Nd4wnjzEtLP',
      'Find us at https://hultprizeuwindsor.ca',
    ].join('\n\n'),
  });
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const secret = PropertiesService.getScriptProperties().getProperty('FORM_SHARED_SECRET');
  if (!secret || secret.length < 32 || params.secret !== secret) return json_({ result: 'error', code: 'unauthorized' });
  const submission = validate_(params);
  if (!submission) return json_({ result: 'error', code: 'invalid_request' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ result: 'error', code: 'busy' });
  try {
    const sheet = getSheet_(submission.action);
    const headers = submission.action === 'enquiry' ? ENQUIRY_HEADERS : HEADERS;
    const requestColumn = headers.indexOf('Request ID') + 1;
    const hashColumn = headers.indexOf('Payload Hash') + 1;
    const notificationColumn = headers.indexOf('Notification Sent') + 1;
    const fingerprint = digest_(JSON.stringify(submission));
    // Extending the header row preserves the seven existing signup columns.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    const lastRow = sheet.getLastRow();
    const existing = lastRow > 1 ? sheet.getRange(2, requestColumn, lastRow - 1, 1)
      .createTextFinder(submission.requestId).matchEntireCell(true).findNext() : null;
    let row;
    if (existing) {
      row = existing.getRow();
      if (sheet.getRange(row, hashColumn).getValue() !== fingerprint) return json_({ result: 'error', code: 'conflict' });
    } else {
      const cache = CacheService.getScriptCache();
      const rateKey = 'form-' + digest_(submission.action + ':' + submission.email);
      const count = Number(cache.get(rateKey) || '0');
      if (count >= 6) return json_({ result: 'error', code: 'rate_limited' });
      cache.put(rateKey, String(count + 1), 600);
      const values = submission.action === 'enquiry'
        ? [new Date(), cell_(submission.name), cell_(submission.email), submission.topic, cell_(submission.message)]
        : [new Date(), cell_(submission.name), cell_(submission.email), cell_(submission.program), submission.year, cell_(submission.phone), submission.teamStatus];
      sheet.appendRow(values.concat([submission.requestId, fingerprint, '']));
      SpreadsheetApp.flush();
      row = sheet.getLastRow();
    }
    // Saving succeeds independently of email availability. Retry a pending
    // notification on a repeated request; never append a duplicate response.
    if (!sheet.getRange(row, notificationColumn).getValue()) {
      try {
        notify_(submission);
        sheet.getRange(row, notificationColumn).setValue(new Date());
      } catch (error) {
        console.error('Response saved; notification pending. Check the response sheet.');
      }
    }
    return json_({ result: 'success', saved: true, requestId: submission.requestId });
  } catch (error) {
    console.error('Form submission could not be confirmed.');
    return json_({ result: 'error', code: 'unconfirmed' });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ status: 'ok', version: 2 });
}
