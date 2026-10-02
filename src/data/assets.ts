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

// Selected for the homepage phone gallery at the website owner's request.
// Leave dates out of this selection until the event date is confirmed.
export const HOME_EVENT_PHOTOS: PhotoSlide[] = permissions.homeGalleryFiles.flatMap(file => {
  const image = Object.values(CAMPUS_PHOTOS).find(item => item.src === `/images/year-one/${file}`)
  return image ? [{ ...image, caption: image.caption.split(' · ')[0] }] : []
})

// Set to local /downloads/... PDF paths once the approved files arrive.
export const DOWNLOADS: { overview?: string; partnershipProposal?: string } = {}
