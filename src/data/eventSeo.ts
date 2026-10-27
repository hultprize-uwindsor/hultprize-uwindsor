import type { AttendanceEvent } from '../lib/attendance.ts'

// What search engines read about an event: a title and description that say when and where, and schema.org Event
// data (https://developers.google.com/search/docs/appearance/structured-data/event) so the event can appear in Google's
// event listings. Shared by the static pages the build writes and by the live page, which refreshes it from the live
// schedule. Plain functions with no React, so the build script can import them too.

const ORGANISER = 'Hult Prize at the University of Windsor'

const format = (event: AttendanceEvent, options: Intl.DateTimeFormatOptions, at = event.startsAt) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: event.timeZone, ...options }).format(new Date(at))
const time = (event: AttendanceEvent, at: string) => format(event, { hour: 'numeric', minute: '2-digit', hour12: true }, at)

/** "Thursday, November 13, 2026, 5:30 p.m. to 7:00 p.m." in the event's own time zone. */
export const eventWhen = (event: AttendanceEvent) =>
  `${format(event, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${time(event, event.startsAt)} to ${time(event, event.endsAt)}`

/** The page title: the event and its day, so a search for the date finds it. */
export const eventPageTitle = (event: AttendanceEvent) => `${event.title}, ${format(event, { month: 'long', day: 'numeric' })}`

/** The search snippet: when and where first, then what it is. */
export const eventPageDescription = (event: AttendanceEvent) =>
  `${eventWhen(event)} at ${event.venue.split(',').slice(0, 2).join(',')}, Windsor. ${event.description} Free to attend; register online.`

/** An ISO date-time with the event's UTC offset, as schema.org asks (2026-11-13T17:30:00-05:00). */
function localIso(at: string, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset' })
    .formatToParts(new Date(at)).map(part => [part.type, part.value]))
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : parts.timeZoneName.replace('GMT', '')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`
}

/** A postal address for each venue the programme uses; anything else falls back to the venue as written, in Windsor. */
function place(venue: string) {
  const address = (streetAddress?: string, postalCode?: string) => ({ '@type': 'PostalAddress', ...(streetAddress && { streetAddress }), addressLocality: 'Windsor', addressRegion: 'ON', ...(postalCode && { postalCode }), addressCountry: 'CA' })
  const street = venue.match(/\d+ [^,]+/)?.[0]
  if (/Joyce Entrepreneurship Centre/i.test(venue)) return { '@type': 'Place', name: venue, address: address('2455 Wyandotte St. W.', 'N9B 0C1') }
  if (street) return { '@type': 'Place', name: venue.split(',')[0], address: address(street) }
  if (/University of Windsor/i.test(venue)) return { '@type': 'Place', name: venue, address: address('401 Sunset Avenue', 'N9B 3P4') }
  return { '@type': 'Place', name: venue, address: address() }
}

/** schema.org Event data for one event. */
export function eventStructuredData(event: AttendanceEvent, origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: localIso(event.startsAt, event.timeZone),
    endDate: localIso(event.endsAt, event.timeZone),
    eventStatus: `https://schema.org/${event.status === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place(event.venue),
    image: [new URL('/images/social/events.png', origin).href],
    url: new URL(`/events/${event.id}`, origin).href,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD', availability: `https://schema.org/${event.status === 'full' ? 'SoldOut' : 'InStock'}`, url: new URL(`/attend?events=${encodeURIComponent(event.id)}`, origin).href },
    organizer: { '@type': 'Organization', name: ORGANISER, url: origin },
  }
}
