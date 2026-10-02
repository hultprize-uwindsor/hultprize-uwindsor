// Central place for site-wide copy so it's easy to update in one spot.
export const SITE = {
  siteName: 'Hult Prize at University of Windsor',
  tagline: 'One idea, 4 minutes, $1,000,000.',
  contactEmail: 'hultprizeatuwindsor@gmail.com',
  // Direct line to the Campus Director, shown as a second contact point.
  campusDirectorEmail: 'akhtari1@uwindsor.ca',
  websiteUrl: 'https://hultprizeuwindsor.ca',
  instagramHandle: '@hultprizeatuwindsor',
  instagramUrl: 'https://www.instagram.com/hultprizeatuwindsor/',
  signalRegisteredUrl: 'https://signal.group/#CjQKIKs4d_yjcI_b8-HQDZOUCTPgrwHLO9afYy86-aIccZO2EhA2jvXrmEDUZ5fvaccFQciT',
  signalLookingUrl: 'https://signal.group/#CjQKIDgWmVxurnfxm-CnNUj-p6FY82u5bDTTlh0RSWC1Ag9xEhAqSS4Wby7U4Nd4wnjzEtLP',
  registrationUrl: 'https://www.hultprize.org/register',
  // The national site. Linked from the header text link and the footer marks only.
  globalUrl: 'https://www.hultprize.org/',
  linkedinUrl: 'https://www.linkedin.com/company/hult-prize-at-the-university-of-windsor/',
  // Not currently shown on the site (pulled per request). Kept here so it's
  // a one-line change to bring back, or swap for the next milestone.
  launchDay: 'October 1, 2026',
  launchDayDetail: '2:00–4:00 PM, Joyce Entrepreneurship Centre (2nd floor). Join the Fusion launch, where Hult Prize at UWindsor gets an HQ of its own.',
  registrationCloses: 'November 20',
  qualifierFinals: 'February 5, 2027',
}

// One switch for arrivals site-wide: card groups below the first screen and photos still loading. UI feedback is unaffected.
export const REVEAL_ON_SCROLL = true

// The page content fades in on load and on each page change: opacity only, 300ms, never the header. Off under reduced motion.
export const FADE_IN_ON_LOAD = true
