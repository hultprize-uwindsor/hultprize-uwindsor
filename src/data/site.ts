// Central place for site-wide copy so it's easy to update in one spot.
export const SITE = {
  siteName: 'Hult Prize at University of Windsor',
  tagline: 'One idea, 4 minutes, $1,000,000.',
  contactEmail: 'hultprizeatuwindsor@gmail.com',
  // Direct line to the Campus Director, shown as a second contact point.
  campusDirectorEmail: 'akhtari1@uwindsor.ca',
  websiteUrl: 'https://hultprizeatuwindsor.ca',
  instagramHandle: '@hultprizeatuwindsor',
  instagramUrl: 'https://www.instagram.com/hultprizeatuwindsor/',
  signalRegisteredUrl: 'https://signal.group/#CjQKIKs4d_yjcI_b8-HQDZOUCTPgrwHLO9afYy86-aIccZO2EhA2jvXrmEDUZ5fvaccFQciT',
  signalLookingUrl: 'https://signal.group/#CjQKIDgWmVxurnfxm-CnNUj-p6FY82u5bDTTlh0RSWC1Ag9xEhAqSS4Wby7U4Nd4wnjzEtLP',
  registrationUrl: 'https://www.hultprize.org/register',
  linkedinUrl: 'https://www.linkedin.com/company/hult-prize-at-the-university-of-windsor/',
  // Not currently shown on the site (pulled per request). Kept here so it's
  // a one-line change to bring back, or swap for the next milestone.
  launchDay: 'September 29, 2026',
  launchDayDetail: '1:00–3:00 PM, Joyce Entrepreneurship Centre (2nd floor). Join our Fusion x Hult Prize launch, where UWindsor Hult Prize gets an HQ of its own.',
  registrationCloses: 'November 20',
  qualifierFinals: 'February 5, 2027',
  // The Google Apps Script Web App URL that receives sign-up form submissions
  // and appends a row to the team's Google Sheet. Set at deploy time.
  formEndpoint: import.meta.env.VITE_FORM_ENDPOINT ?? '',
}
