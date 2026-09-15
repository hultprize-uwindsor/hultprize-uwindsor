/**
 * Hult Prize @ UWindsor — sign-up form backend.
 *
 * Setup:
 * 1. Create a Google Sheet (e.g. "Hult Prize Sign-ups"). Add a header row:
 *    Timestamp | Name | Email | Program | Year | Phone | Team Status
 * 2. Extensions > Apps Script, paste this file in as Code.gs.
 * 3. Deploy > New deployment > type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL into VITE_FORM_ENDPOINT (see .env.example).
 */

const SHEET_NAME = 'Sign-ups'; // change to match your sheet/tab name

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
    || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

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
