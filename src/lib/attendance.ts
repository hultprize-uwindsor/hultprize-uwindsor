import { useCallback, useEffect, useState } from 'react'
import seedEvents from '../../shared/attendance-events.json'

export type AttendanceEvent = {
  id: string
  title: string
  group: 'community' | 'workshops' | 'finale'
  startsAt: string
  endsAt: string
  timeZone: string
  venue: string
  description: string
  status: 'open' | 'full' | 'closed' | 'cancelled' | 'completed'
  capacity: number | null
  allowLateRegistration: boolean
  preparation: string
}

export const CATEGORY_OPTIONS = [
  ['undergraduate', 'Undergraduate student'],
  ['graduate', 'Graduate student'],
  ['other-student', 'Other student'],
  ['sponsor', 'Sponsor / partner representative'],
  ['founder', 'Founder / mentor / judge'],
  ['faculty', 'Faculty / staff'],
  ['alumni', 'Alumni'],
  ['community', 'Community guest'],
] as const
export type AttendeeCategory = typeof CATEGORY_OPTIONS[number][0]
export type AttendeeDetails = {
  firstName: string
  lastName: string
  email: string
  category: AttendeeCategory | ''
  institution: string
  faculty: string
  organisation: string
  role: string
  withTeam: boolean
  teamName: string
  dietary: string
  accessibility: string
  referral: string
}
export type AttendanceRegistration = {
  id: string
  eventId: string
  status: 'confirmed' | 'waitlisted' | 'offered' | 'cancelled'
  event?: AttendanceEvent
}
export type ManageAttendanceResponse = {
  ok: boolean
  attendee: AttendeeDetails
  registrations: AttendanceRegistration[]
  events: AttendanceEvent[]
}
export type RegistrationResponse = {
  ok: boolean
  saved?: boolean
  verificationRequired?: boolean
  message?: string
  attendee?: Pick<AttendeeDetails, 'firstName' | 'lastName'>
  registrations?: AttendanceRegistration[]
  manageUrl?: string
}
export const GROUP_LABELS = {
  community: 'Meet the community',
  workshops: 'Build your venture',
  finale: 'Watch the pitches',
}
export const REGISTRATION_STATUS_LABELS = {
  confirmed: 'Confirmed',
  waitlisted: 'Waitlisted',
  offered: 'Seat offered - check your email',
  cancelled: 'Cancelled',
}
export const attendanceSeedEvents = seedEvents as AttendanceEvent[]

export class AttendanceApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AttendanceApiError'
    this.status = status
  }
}

// No credentials, attendee information, or management tokens enter local storage.
export async function attendanceApi<T>(action: string, body?: object): Promise<T> {
  const read = (action === 'events' || action === 'manage') && !body
  let response: Response
  try {
    response = await fetch(read ? `/api/attendance?action=${encodeURIComponent(action)}` : '/api/attendance', {
      method: read ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: read ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: read ? undefined : JSON.stringify({ action, ...body }),
    })
  } catch {
    throw new AttendanceApiError('We could not reach event registration. Check your connection and try again. Your entries are still on this page.', 0)
  }
  let data: { ok?: boolean; error?: string; message?: string }
  try {
    data = await response.json()
  } catch {
    throw new AttendanceApiError('Event registration is temporarily unavailable. Please try again later.', response.status)
  }
  if (!response.ok || data.ok !== true) {
    throw new AttendanceApiError(typeof data.error === 'string' ? data.error : data.message || 'We could not complete that request. Please try again.', response.status)
  }
  return data as T
}

export function useAttendanceEvents() {
  const [events, setEvents] = useState<AttendanceEvent[]>(attendanceSeedEvents)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => { setLoading(true); setRevision(value => value + 1) }, [])
  useEffect(() => {
    let active = true
    attendanceApi<{ ok: true; events: AttendanceEvent[] }>('events').then(data => {
      if (!Array.isArray(data.events)) throw new Error('Event schedule is unavailable.')
      if (active) {
        setEvents([...data.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
        setLive(true)
        setError('')
      }
    }).catch(() => {
      if (active) {
        setLive(false)
        setError('Registration is temporarily unavailable. The schedule below is for reference; no registration can be submitted yet.')
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  return { events, loading, live, error, refresh }
}

export function eventDate(event: AttendanceEvent, short = false) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: event.timeZone,
    weekday: short ? 'short' : 'long',
    month: short ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(event.startsAt))
}

export function eventTime(event: AttendanceEvent) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: event.timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
  return `${formatter.format(new Date(event.startsAt))}-${formatter.format(new Date(event.endsAt))}`
}

export function eventStatus(event: AttendanceEvent, now = Date.now()): AttendanceEvent['status'] {
  if (['cancelled', 'completed', 'closed'].includes(event.status)) return event.status
  if (new Date(event.endsAt).getTime() <= now) return 'completed'
  if (!event.allowLateRegistration && new Date(event.startsAt).getTime() <= now) return 'closed'
  return event.status
}

export function canSelectEvent(event: AttendanceEvent) {
  return ['open', 'full'].includes(eventStatus(event))
}

export function eventStatusLabel(event: AttendanceEvent) {
  return { open: 'Open', full: 'Full · Join the waitlist', closed: 'Registration closed', cancelled: 'Cancelled', completed: 'Completed' }[eventStatus(event)]
}

const calendarStamp = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

export function googleCalendarUrl(event: AttendanceEvent) {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${calendarStamp(event.startsAt)}/${calendarStamp(event.endsAt)}`, ctz: event.timeZone, location: event.venue, details: `${event.description}\n${event.preparation || ''}\nFree · Drinks and snacks provided.` })
  return `https://calendar.google.com/calendar/render?${params}`
}

const icsText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')

// Fold at a UTF-8 byte boundary for Outlook, Apple Calendar and other ICS clients.
function foldCalendarLine(line: string) {
  const encoder = new TextEncoder()
  let folded = ''
  let byteCount = 0
  for (const character of line) {
    const bytes = encoder.encode(character).length
    if (byteCount + bytes > 75) { folded += '\r\n '; byteCount = 1 }
    folded += character
    byteCount += bytes
  }
  return folded
}

export function calendarFile(event: AttendanceEvent) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hult Prize UWindsor//Event Attendance//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${event.id}@hultprizeuwindsor.ca`, `DTSTAMP:${calendarStamp(new Date().toISOString())}`, `DTSTART:${calendarStamp(event.startsAt)}`, `DTEND:${calendarStamp(event.endsAt)}`, `SUMMARY:${icsText(event.title)}`, `LOCATION:${icsText(event.venue)}`, `DESCRIPTION:${icsText(`${event.description}\n${event.preparation || ''}\nFree · Drinks and snacks provided.`)}`, 'END:VEVENT', 'END:VCALENDAR'].map(foldCalendarLine).join('\r\n') + '\r\n'
}

export function downloadCalendar(event: AttendanceEvent) {
  const url = URL.createObjectURL(new Blob([calendarFile(event)], { type: 'text/calendar;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${event.id}.ics`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function teamRegistrationUrl(eventIds: string[], teamName: string) {
  const params = new URLSearchParams({ events: eventIds.join(',') })
  if (teamName.trim()) params.set('team', teamName.trim())
  return `${window.location.origin}/attend?${params}`
}
