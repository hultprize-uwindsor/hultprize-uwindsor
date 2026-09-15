// Central place for site-wide copy so it's easy to update in one spot.
export const SITE = {
  siteName: 'Hult Prize at University of Windsor',
  // TODO: swap for the team's real inbox once confirmed.
  contactEmail: 'hultprize@uwindsor.ca',
  instagramHandle: '', // e.g. '@hultprizeuwindsor' — leave blank to hide
  instagramUrl: '',
  linkedinUrl: 'https://www.linkedin.com/company/hult-prize-at-the-university-of-windsor/',
  launchDay: 'September 29, 2026',
  launchDayDetail: '1:00–3:00 PM, Joyce Entrepreneurship Centre (2nd floor) — our Fusion x Hult Prize launch, where UWindsor Hult Prize gets an HQ of its own.',
  registrationCloses: 'November 20',
  campusFinals: 'February 12',
  // The Google Apps Script Web App URL that receives sign-up form submissions
  // and appends a row to the team's Google Sheet. Set at deploy time.
  formEndpoint: import.meta.env.VITE_FORM_ENDPOINT ?? '',
}
