/**
 * Hult Prize @ UWindsor sign-up form backend.
 *
 * This is a standalone Apps Script project (not container-bound), so it
 * references the spreadsheet by ID rather than via getActiveSpreadsheet().
 *
 * Setup:
 * 1. Create a Google Sheet (e.g. "Hult Prize UWindsor Sign-ups") and copy
 *    its ID out of the URL into SHEET_ID below.
 * 2. Go to script.google.com > New project, paste this file in as Code.gs.
 * 3. Run `setupSheet` once (from the function picker + Run button) to
 *    write the bold header row. The first run will prompt for
 *    authorization. Approve it.
 * 4. Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    Approve the additional "Authorize access" prompt for the web app.
 * 5. Copy the deployment /exec URL into VITE_FORM_ENDPOINT (see .env.example
 *    and the Vercel project's environment variables).
 */

const SHEET_ID = '1-XbLak_hLNsE6HDafRqcL0iuQBeAUxQ1KRTHRSXFHLQ';
const SHEET_NAME = 'Sheet1';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Program', 'Year', 'Phone', 'Team Status'];

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
}

/** Run once (manually, from the Apps Script editor) to (re)write the header row. */
function setupSheet() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function doPost(e) {
  const sheet = getSheet_();
  const params = e.parameter;

  sheet.appendRow([
    new Date(),
    params.name || '',
    params.email || '',
    params.program || '',
    params.year || '',
    params.phone || '',
    params.teamStatus || '',
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ result: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
