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
  director: photo('campus-presentation', 'An organiser addressing the room with a microphone beside two event attendees', 'Addressing the campus community'),
}
export const YEAR_ONE_PHOTOS: PhotoSlide[] = SHOW_EVENT_PHOTOS ? [
  CAMPUS_PHOTOS.pitch, CAMPUS_PHOTOS.feedback, CAMPUS_PHOTOS.audience,
  CAMPUS_PHOTOS.applause, CAMPUS_PHOTOS.director, CAMPUS_PHOTOS.teams,
  CAMPUS_PHOTOS.community,
] : []

// Set to local /downloads/... PDF paths once the approved files arrive.
export const DOWNLOADS: { overview?: string; partnershipProposal?: string } = {}
