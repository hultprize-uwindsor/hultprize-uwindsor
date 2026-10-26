// Central place for site-wide copy so it's easy to update in one spot.
export const SITE = {
  siteName: 'Hult Prize at University of Windsor',
  tagline: 'One idea. Four minutes. $1,000,000.',
  // Grayfel Technologies sponsored the website build, domain and hosting; the footer credits and links it.
  sponsorName: 'Grayfel Technologies',
  sponsorUrl: 'https://grayfeltechnologiesinc.ca/',
  // Organiser-approved invite; also the attendance email default in Attendance.gs.
  discordUrl: 'https://discord.gg/ybeQYQxcqZ',
  contactEmail: 'hultprizeatuwindsor@gmail.com',
  // Direct line to the Campus Director, shown as a second contact point.
  campusDirectorEmail: 'akhtari1@uwindsor.ca',
  websiteUrl: 'https://hultprizeuwindsor.ca',
  instagramHandle: '@hultprizeatuwindsor',
  instagramUrl: 'https://www.instagram.com/hultprizeatuwindsor/',
  registrationUrl: 'https://www.hultprize.org/register',
  // The national site. Linked from the header text link and the footer marks only.
  globalUrl: 'https://www.hultprize.org/',
  linkedinUrl: 'https://www.linkedin.com/company/hult-prize-at-the-university-of-windsor/',
  // Not currently shown on the site (pulled per request). Kept here so it's
  // a one-line change to bring back, or swap for the next milestone.
  launchDay: 'October 1, 2026',
  launchDayDetail: '2:00-4:00 PM, Joyce Entrepreneurship Centre (2nd floor). Join the Fusion launch, where Hult Prize at UWindsor gets an HQ of its own.',
  registrationCloses: 'November 20',
  // The same deadline as a date, for the homepage calendar.
  registrationClosesOn: '2026-11-20',
}

// One switch for arrivals site-wide: card groups below the first screen and photos still loading. UI feedback is unaffected.
export const REVEAL_ON_SCROLL = true

// The page content fades in on load and on each page change: opacity only, 300ms, never the header. Off under reduced motion.
export const FADE_IN_ON_LOAD = true
