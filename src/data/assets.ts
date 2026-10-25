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
export const YEAR_ONE_PHOTOS: PhotoSlide[] = SHOW_EVENT_PHOTOS ? [
  CAMPUS_PHOTOS.pitch, CAMPUS_PHOTOS.feedback, CAMPUS_PHOTOS.audience,
  CAMPUS_PHOTOS.applause, CAMPUS_PHOTOS.director, CAMPUS_PHOTOS.teams,
  CAMPUS_PHOTOS.community,
] : []

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
  ['year-one-0138'], ['launch-1900'], ['year-one-0686'], ['launch-1786'], ['year-one-0073', true], ['launch-1771'],
]
export const HOME_BOARD_PHOTOS: BoardPhoto[] = BOARD_ORDER
  .filter(([name]) => SHOW_EVENT_PHOTOS || permissions.heroBoardApproved || permissions.homeGalleryFiles.includes(`${name}.jpg`))
  .map(([name, portrait]) => ({ name, src: `/images/board/${name}-360.webp`, srcSet: `/images/board/${name}-360.webp 360w, /images/board/${name}-720.webp 720w`, portrait }))

// Set to local /downloads/... PDF paths once the approved files arrive.
export const DOWNLOADS: { overview?: string; partnershipProposal?: string } = {}
