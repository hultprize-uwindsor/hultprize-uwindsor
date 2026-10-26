import type { PhotoSlide } from '../components/PhotoCarousel'
import permissions from './photo-permissions.json'

// Local review is available now. Publication requires the clearance requested
// in the build brief; the production build also excludes unapproved image files.
export const SHOW_EVENT_PHOTOS = import.meta.env.DEV || permissions.approvedForPublication
const photo = (file: string, alt: string, caption: string): PhotoSlide => ({
  src: `/images/year-one/${file}.jpg`,
  alt,
  caption: `${caption} · ${permissions.captionDate}`,
})
export const CAMPUS_PHOTOS = {
  room: photo('auditorium-conversations', 'Attendees talking around tables in the University of Windsor Alumni Auditorium', 'Conversations in the Alumni Auditorium'),
  pitch: photo('team-pitch', 'Two students presenting a flood-response idea, with one speaking and the other holding a model', 'A student team presents its idea'),
  audience: photo('audience', 'Audience members watching a presentation with notes and laptops at their tables', 'Listening to the student pitches'),
  feedback: photo('pitch-feedback', 'A seated attendee speaking into a microphone while others listen and take notes', 'Questions and feedback after a pitch'),
  applause: photo('student-applause', 'Students applauding from their seats in the audience', 'Students supporting the teams'),
  teams: photo('teams-onstage', 'Student teams holding small trophies onstage alongside event attendees', 'Teams on the Grand Finale stage'),
  community: photo('community-onstage', 'A group of event participants posing onstage between two campus sponsor banners', 'The community behind the campus round'),
  // Used only on Compete, so that page does not repeat photos shown elsewhere.
  stage: photo('pitch-on-stage', 'A student in a black suit and glasses speaks into a microphone beside a wooden podium, gesturing as she pitches to the audience', 'A student pitches from the stage'),
  teamwork: photo('team-laptop', 'Three students in black T-shirts sit together at a table around a laptop, two of them smiling as they work', 'Teammates working together'),
  director: photo('campus-presentation', 'An organiser addressing the room with a microphone beside two event attendees', 'Addressing the campus community'),
}
// Year one in pictures: the 18 approved board photos from the first season, with the 720px copy's height so the
// gallery reserves space before each loads. The gallery shows the 360/720px copies and the photo drawer the
// 1440px one. Captions leave the date out until it is confirmed.
const YEAR_ONE_GALLERY: [name: string, alt: string, caption: string, height: number][] = [
  ['team-pitch', 'Two students presenting a flood-response idea, with one speaking and the other holding a model', 'A student team presents its idea', 576],
  ['year-one-0653', 'A host with a microphone celebrates onstage as a team holds up its trophies', 'Celebrating on stage', 576],
  ['year-one-0083', 'Two gold Hult Prize trophies engraved “uWindsor Winner, Hult Prize 2026”', 'The campus trophies', 1280],
  ['student-applause', 'Students applauding from their seats in the audience', 'Students supporting the teams', 576],
  ['pitch-feedback', 'A seated attendee speaking into a microphone while others listen and take notes', 'Questions and feedback after a pitch', 576],
  ['year-one-0086', 'Two students in white Hult Prize T-shirts smile beside a laptop', 'Hult Prize T-shirts on', 1280],
  ['teams-onstage', 'Student teams holding small trophies onstage alongside event attendees', 'Teams on the Grand Finale stage', 576],
  ['year-one-0474', 'A speaker at the podium points to the screen while presenting', 'Making the case', 576],
  ['year-one-0094', 'A smiling student holds up a white Hult Prize T-shirt', 'Fresh Hult Prize merch', 1280],
  ['year-one-0125', 'Three students in black T-shirts sit together at a table around a laptop, two of them smiling as they work', 'Teammates working together', 576],
  ['year-one-0138', 'An attendee in a blue sweater and plaid scarf smiles while listening at a table', 'Listening in', 576],
  ['year-one-0686', 'Four students in black T-shirts strike a playful pose together onstage', 'Team spirit', 576],
  ['year-one-0293', 'A student holding notes listens from their seat in the audience', 'Notes in hand', 1280],
  ['campus-presentation', 'An organiser addressing the room with a microphone beside two event attendees', 'Addressing the campus community', 576],
  ['year-one-0080', 'Three attendees in jackets pose together at the event', 'Dressed for the occasion', 576],
  ['year-one-0493', 'Two attendees smile together for a photo in the auditorium', 'A photo to remember', 576],
  ['year-one-0073', 'Two attendees wearing name lanyards smile side by side in the auditorium', 'All smiles', 1280],
  ['community-onstage', 'A group of event participants posing onstage between two campus sponsor banners', 'The community behind the campus round', 480],
]
export const YEAR_ONE_PHOTOS: PhotoSlide[] = SHOW_EVENT_PHOTOS || permissions.heroBoardApproved ? YEAR_ONE_GALLERY.map(([name, alt, caption, height]) => ({
  src: `/images/board/${name}-1440.webp`, thumb: `/images/board/${name}-360.webp`, srcSet: `/images/board/${name}-360.webp 360w, /images/board/${name}-720.webp 720w`, alt, caption, width: 720, height,
})) : []

// Selected for the homepage event gallery at the website owner's request.
// Leave dates out of this selection until the event date is confirmed.
export const HOME_EVENT_PHOTOS: PhotoSlide[] = permissions.homeGalleryFiles.flatMap(file => {
  const image = Object.values(CAMPUS_PHOTOS).find(item => item.src === `/images/year-one/${file}`)
  return image ? [{ ...image, caption: image.caption.split(' · ')[0] }] : []
})

// Homepage cork board: year-one (February 5, 2026) and Fusion launch (October 1, 2026) photos as
// 360/720px WebP copies in /images/board, in pin order; narrow screens pin only the first few.
// All 36 are approved for the public board (`heroBoardApproved`); without that approval,
// production would pin only the photos cleared in `homeGalleryFiles`, which keep their export names.
export type BoardPhoto = { name: string; src: string; srcSet: string; portrait?: boolean }
const BOARD_ORDER: [name: string, portrait?: true][] = [
  ['team-pitch'], ['launch-1810'], ['student-applause'], ['launch-1860'], ['year-one-0653'], ['launch-1888'],
  ['year-one-0086', true], ['launch-1822'], ['teams-onstage'], ['launch-1849'], ['pitch-feedback'], ['launch-1658'],
  ['year-one-0083', true], ['launch-1829'], ['year-one-0094', true], ['launch-1763'], ['campus-presentation'], ['launch-1724'],
  ['year-one-0080'], ['launch-1661'], ['year-one-0293', true], ['launch-1866'], ['community-onstage'], ['launch-1839'],
  ['year-one-0125'], ['launch-1738'], ['year-one-0474'], ['launch-1819'], ['year-one-0493'], ['launch-1873'],
  ['year-one-0138'], ['launch-1900', true], ['year-one-0686'], ['launch-1786'], ['year-one-0073', true], ['launch-1771'],
]
export const HOME_BOARD_PHOTOS: BoardPhoto[] = BOARD_ORDER
  .filter(([name]) => SHOW_EVENT_PHOTOS || permissions.heroBoardApproved || permissions.homeGalleryFiles.includes(`${name}.jpg`))
  .map(([name, portrait]) => ({ name, src: `/images/board/${name}-360.webp`, srcSet: `/images/board/${name}-360.webp 360w, /images/board/${name}-720.webp 720w`, portrait }))

// Launch day at Fusion (October 1, 2026): every launch photo on the approved board, with descriptions and captions.
// All are 720×480 except one portrait (720×1080). Empty when the board photos aren't published.
const LAUNCH_PHOTOS: [name: string, alt: string, caption: string][] = [
  ['launch-1810', 'Three students holding pink gift bags look at their phones at the launch', 'Goodie bags'],
  ['launch-1888', 'Flyers announcing UWindsor as the Best Program in North America, laid out on a table', 'Best in North America'],
  ['launch-1849', 'Students chat beside yellow and blue balloons at the launch', 'Balloons up'],
  ['launch-1860', 'Two attendees smile together for a photo at the launch', 'Launch day smiles'],
  ['launch-1658', 'Black EF Hult Prize tote bags laid out on a table', 'Hult Prize totes'],
  ['launch-1822', 'A group of students chat and laugh at the launch', 'Catching up'],
  ['launch-1763', 'Two attendees share a laugh during a conversation at the launch', 'Good conversations'],
  ['launch-1829', 'Attendees laugh together during a conversation at the launch', 'Laughs all round'],
  ['launch-1724', 'Fusion stickers, lanyards, pens and flyers spread across a round table', 'Fusion swag'],
  ['launch-1819', 'Students laugh around a table with two red game buzzers', 'Game time'],
  ['launch-1873', 'A student signs a sheet on a Hult Prize clipboard, a drink in hand', 'Signing up'],
  ['launch-1661', 'Three students gather at a desk with a laptop in Fusion', 'Heads together'],
  ['launch-1866', 'Two attendees talk in front of event banners at the launch', 'Making connections'],
  ['launch-1839', 'An exhibitor in a yellow top talks with visitors at a partner booth', 'Partner booths'],
  ['launch-1900', 'Three guests in blazers pose together in front of Fusion banners', 'Picture time'],
  ['launch-1738', 'Three attendees talk beside a table of pink gift bags', 'Deep in conversation'],
  ['launch-1786', 'Two attendees smile at a laptop beside a screen showing a robotics demo', 'Demos on show'],
  ['launch-1771', 'Two attendees chat in a busy room at the launch', 'A busy room'],
]
export const LAUNCH_DAY_GALLERY = LAUNCH_PHOTOS.flatMap(([name, alt, caption]) => {
  const photo = HOME_BOARD_PHOTOS.find(item => item.name === name)
  return photo ? [{ ...photo, alt, caption, width: 720, height: photo.portrait ? 1080 : 480 }] : []
})
// The eight shown as taped snapshots on This Year.
export const LAUNCH_DAY_PHOTOS = LAUNCH_DAY_GALLERY.slice(0, 8)

// Set to local /downloads/... PDF paths once the approved files arrive.
export const DOWNLOADS: { overview?: string; partnershipProposal?: string } = {}
