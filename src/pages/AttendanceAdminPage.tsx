import { cloneElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import './AttendanceAdmin.css'

type EventStatus = 'open' | 'full' | 'closed' | 'cancelled' | 'completed'
type RegistrationStatus = 'confirmed' | 'waitlisted' | 'offered' | 'cancelled'
type EventRecord = {
  id: string; title: string; group: 'community' | 'workshops' | 'finale'; startsAt: string; endsAt: string
  timeZone: string; venue: string; description: string; status: EventStatus; capacity: number | null
  allowLateRegistration: boolean; preparation?: string; effectiveStatus?: EventStatus
}
type Attendee = {
  id: string; firstName?: string; lastName?: string; email?: string; category: string; institution?: string
  faculty?: string; organisation?: string; role?: string; teamName?: string; dietary?: string; accessibility?: string
}
type Registration = { id: string; attendeeId: string; eventId: string; status: RegistrationStatus; createdAt?: string }
type Checkin = { id: string; registrationId: string; checkedInAt: string }
type Delivery = { id: string; attendeeId: string; eventId?: string; type?: string; kind?: string; status: string; lastError?: string; error?: string; attempts?: number }
type Dashboard = { events: EventRecord[]; attendees: Attendee[]; registrations: Registration[]; deliveries: Delivery[]; checkins: Checkin[]; canViewSupport: boolean }
type Row = { registration: Registration; attendee: Attendee; event: EventRecord; checkin?: Checkin }
type Result = { ok?: boolean; message?: string; notificationRequired?: boolean; queued?: number }
type Filters = { eventIds: string[]; category: string; institution: string; faculty: string; team: string; status: string; search: string }

const CATEGORIES: [string, string][] = [
  ['undergraduate', 'Undergraduate student'], ['graduate', 'Graduate student'], ['other-student', 'Other student'],
  ['sponsor', 'Sponsor / partner representative'], ['founder', 'Founder / mentor / judge'], ['faculty', 'Faculty / staff'],
  ['alumni', 'Alumni'], ['community', 'Community guest'],
]
const FACULTIES = ['Arts, Humanities and Social Sciences', 'Business', 'Education', 'Engineering', 'Human Kinetics', 'Law', 'Nursing', 'Science', 'Other', 'Undecided / not applicable']
const EMPTY_FILTERS: Filters = { eventIds: [], category: '', institution: '', faculty: '', team: '', status: '', search: '' }
const ZONE = 'America/Toronto'
const categoryLabel = (value: string) => CATEGORIES.find(([id]) => value === id)?.[1] ?? value
const personName = (person: Attendee) => [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Anonymised attendee'
const isStudent = (category: string) => ['undergraduate', 'graduate', 'other-student'].includes(category)
const displayTime = (value: string) => new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONE }).format(new Date(value))
const effectiveStatus = (event: EventRecord): EventStatus => event.effectiveStatus ?? (event.status === 'open' && !event.allowLateRegistration && Date.now() >= Date.parse(event.startsAt) ? 'closed' : event.status)

class RequestError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function api<T>(action: string, body?: object): Promise<T> {
  const response = await fetch(body === undefined ? `/api/attendance?action=${encodeURIComponent(action)}` : '/api/attendance', {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer',
    headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify({ ...body, action }) }),
  })
  let result: T & { ok?: boolean; error?: string; message?: string }
  try { result = await response.json() } catch { throw new RequestError('The attendance service is unavailable. Please try again.', response.status) }
  if (!response.ok || result.ok !== true) throw new RequestError(result.error || result.message || (response.status === 401 ? 'Your organiser session expired. Please sign in again.' : 'The request could not be completed. Please try again.'), response.status)
  return result
}

// Form values are Windsor wall-clock times; never interpret them in the organiser's device timezone.
function localDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

function localTimeToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a complete event date and time.')
  const guess = Date.parse(`${value}:00Z`)
  if (!Number.isFinite(guess)) throw new Error('Enter a valid event date and time.')
  const matches = new Set<string>()
  // Toronto's UTC offsets are −04:00 and −05:00. Round-trip both to detect DST gaps and repeated times.
  for (const hours of [4, 5]) {
    const instant = new Date(guess + hours * 3_600_000).toISOString()
    if (localDateTime(instant) === value) matches.add(instant)
  }
  if (matches.size !== 1) throw new Error(matches.size ? 'This Windsor time occurs twice during the daylight-saving change. Choose a time outside the repeated hour.' : 'This Windsor time does not exist during the daylight-saving change. Choose another time.')
  return [...matches][0]
}

function csvCell(value: unknown): string {
  let text = String(value ?? '').replaceAll('\0', '')
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function exportRoster(rows: Row[], includeSupport: boolean) {
  const header = ['Registration ID', 'First name', 'Last name', 'Email', 'Category', 'Institution', 'Faculty / area of study', 'Organisation', 'Role', 'Team / venture', 'Event', 'Starts at (UTC)', 'Ends at (UTC)', 'Timezone', 'Venue', 'Registration status', 'Checked in', 'Check-in time (UTC)']
  if (includeSupport) header.push('Dietary requirements', 'Accessibility / accommodation')
  const data = rows.map(({ attendee: a, registration: r, event: e, checkin }) => {
    const fields = [r.id, a.firstName, a.lastName, a.email, categoryLabel(a.category), a.institution, a.faculty, a.organisation, a.role, a.teamName, e.title, e.startsAt, e.endsAt, e.timeZone, e.venue, r.status, checkin ? 'Yes' : 'No', checkin?.checkedInAt]
    if (includeSupport) fields.push(a.dietary, a.accessibility)
    return fields
  })
  const blob = new Blob(['\uFEFF', [header, ...data].map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `hult-attendance${includeSupport ? '-support' : ''}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Field({ label, children, wide = false }: { label: string; children: ReactElement<{ id?: string }>; wide?: boolean }) {
  const id = useId()
  return <div className={`attendance-admin__field${wide ? ' attendance-admin__field--wide' : ''}`}><label htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>
}

function Status({ status }: { status: string }) {
  return <span className={`attendance-admin__status attendance-admin__status--${status}`}>{status === 'offered' ? 'Seat offered' : status}</span>
}

/** The dashboard's own slim bar: the logo back to the public site, the tool's name, and (signed in) refresh and sign out. */
function TopBar({ actions }: { actions?: ReactElement | false | null }) {
  return <div className="attendance-admin__bar">
    <a className="attendance-admin__brand" href="/"><img src="/images/logos/hult-uwindsor-navbar-dark.png" alt="Hult Prize at the University of Windsor, back to the website" width="1348" height="240" /></a>
    <span className="attendance-admin__product">Organiser dashboard</span>
    <div className="attendance-admin__bar-actions">{actions || <a className="attendance-admin__back" href="/">Back to website</a>}</div>
  </div>
}

function Breakdown({ title, people, getValue }: { title: string; people: Attendee[]; getValue: (person: Attendee) => string }) {
  const counts = new Map<string, number>()
  for (const person of people) {
    const value = getValue(person)
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return <details className="attendance-admin__breakdown"><summary>{title} <span>{counts.size} groups</span></summary><dl>{[...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, count]) => <div key={value}><dt>{value}</dt><dd>{count}</dd></div>)}</dl>{!counts.size && <p>No details in this selection.</p>}</details>
}

type EventDraft = Omit<EventRecord, 'startsAt' | 'endsAt' | 'capacity'> & { startsAt: string; endsAt: string; capacity: string }
function eventDraft(event: EventRecord): EventDraft { return { ...event, startsAt: localDateTime(event.startsAt), endsAt: localDateTime(event.endsAt), capacity: event.capacity === null ? '' : String(event.capacity) } }

function EventEditor({ event, busy, onSave, onUpdate }: { event: EventRecord; busy: boolean; onSave: (event: EventRecord) => Promise<Result | null>; onUpdate: () => void }) {
  const [draft, setDraft] = useState(() => eventDraft(event))
  const [error, setError] = useState('')
  // Replace the draft when a save or explicit refresh delivers a new server snapshot.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { setDraft(eventDraft(event)) }, [event])
  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) { setDraft(old => ({ ...old, [key]: value })) }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    try {
      const startsAt = localTimeToIso(draft.startsAt)
      const endsAt = localTimeToIso(draft.endsAt)
      if (endsAt <= startsAt) throw new Error('The event must end after it starts.')
      const capacity = draft.capacity === '' ? null : Number(draft.capacity)
      if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) throw new Error('Capacity must be a whole number between 1 and 100,000, or blank for no configured limit.')
      await onSave({ ...draft, title: draft.title.trim(), venue: draft.venue.trim(), startsAt, endsAt, capacity, timeZone: ZONE })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the event details.') }
  }
  return <details className="attendance-admin__event-editor"><summary><span><strong>{event.title}</strong><small>{displayTime(event.startsAt)} · Windsor time</small></span><Status status={effectiveStatus(event)} /></summary>
    <form onSubmit={submit} className="attendance-admin__form">
      <p className="attendance-admin__muted attendance-admin__field--wide">All date and time fields use America/Toronto, including daylight saving. Changes also update the public registration schedule.</p>
      {error && <p role="alert" className="attendance-admin__error attendance-admin__field--wide">{error}</p>}
      <Field label="Event title" wide><input required maxLength={180} value={draft.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Starts (Windsor time)"><input type="datetime-local" required value={draft.startsAt} onChange={e => set('startsAt', e.target.value)} /></Field>
      <Field label="Ends (Windsor time)"><input type="datetime-local" required value={draft.endsAt} onChange={e => set('endsAt', e.target.value)} /></Field>
      <Field label="Full venue, including floor" wide><input required maxLength={500} value={draft.venue} onChange={e => set('venue', e.target.value)} /></Field>
      <Field label="Short description" wide><textarea required maxLength={2000} rows={3} value={draft.description} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="What to bring or prepare (optional)" wide><textarea maxLength={2000} rows={2} value={draft.preparation ?? ''} onChange={e => set('preparation', e.target.value)} /></Field>
      <Field label="Event group"><select value={draft.group} onChange={e => set('group', e.target.value as EventRecord['group'])}><option value="community">Meet the community</option><option value="workshops">Build your venture</option><option value="finale">Watch the pitches</option></select></Field>
      <Field label="Registration status"><select value={draft.status} onChange={e => set('status', e.target.value as EventStatus)}><option value="open">Open</option><option value="full">Full - waitlist available</option><option value="closed">Registration closed</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></select></Field>
      <Field label="Capacity (blank = no configured limit)"><input type="number" min="1" max="100000" step="1" value={draft.capacity} onChange={e => set('capacity', e.target.value)} /></Field>
      <label className="attendance-admin__check"><input type="checkbox" checked={draft.allowLateRegistration} onChange={e => set('allowLateRegistration', e.target.checked)} /><span>Allow registration after the event begins</span></label>
      <div className="attendance-admin__actions attendance-admin__field--wide"><button className="btn btn--primary" disabled={busy} type="submit">Save event</button></div>
    </form>
    <div className="attendance-admin__event-notice"><p>After saving a material date, time or venue change, notify affected registrants. The email uses the saved details. Saving a cancelled event automatically queues cancellation emails.</p><button type="button" className="btn btn--outline" disabled={busy || event.status === 'cancelled'} onClick={onUpdate}>Email saved event update</button></div>
  </details>
}

const EMPTY_WALKIN = { firstName: '', lastName: '', email: '', category: '', institution: '', otherInstitution: '', faculty: '', organisation: '', role: '', withTeam: false, teamName: '', dietary: '', accessibility: '' }
function WalkInForm({ events, canViewSupport, busy, onSave }: { events: EventRecord[]; canViewSupport: boolean; busy: boolean; onSave: (body: object) => Promise<Result | null> }) {
  const [draft, setDraft] = useState(EMPTY_WALKIN)
  const [eventIds, setEventIds] = useState<string[]>([])
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(crypto.randomUUID())
  const student = isStudent(draft.category)
  function set<K extends keyof typeof EMPTY_WALKIN>(key: K, value: typeof EMPTY_WALKIN[K]) { setDraft(old => ({ ...old, [key]: value })) }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!eventIds.length) { setError('Choose at least one event for this attendee.'); return }
    const { otherInstitution, ...fields } = draft
    const result = await onSave({ attendee: { ...fields, institution: student ? (fields.institution === 'Other' ? otherInstitution.trim() : fields.institution) : '', faculty: student ? fields.faculty : '', organisation: student ? '' : fields.organisation, role: student ? '' : fields.role, teamName: fields.withTeam ? fields.teamName : '', dietary: canViewSupport ? fields.dietary : '', accessibility: canViewSupport ? fields.accessibility : '' }, eventIds, consent, marketingConsent: false, requestId: requestId.current })
    if (result) { setDraft(EMPTY_WALKIN); setEventIds([]); setConsent(false); requestId.current = crypto.randomUUID() }
  }
  return <section aria-labelledby="walkin-heading" className="attendance-admin__panel"><h2 id="walkin-heading">Record a walk-in</h2><p>Each person needs their own record. Confirmed registrations are checked in automatically; a waitlist entry is not an actual check-in. Existing attendees keep their saved personal details.</p>
    <form onSubmit={submit} className="attendance-admin__form">
      {error && <p role="alert" className="attendance-admin__error attendance-admin__field--wide">{error}</p>}
      <Field label="First name"><input required autoComplete="given-name" maxLength={100} value={draft.firstName} onChange={e => set('firstName', e.target.value)} /></Field>
      <Field label="Last name"><input required autoComplete="family-name" maxLength={100} value={draft.lastName} onChange={e => set('lastName', e.target.value)} /></Field>
      <Field label="Email address"><input required type="email" autoComplete="email" maxLength={254} value={draft.email} onChange={e => set('email', e.target.value)} /></Field>
      <Field label="Attendee category"><select required value={draft.category} onChange={e => set('category', e.target.value)}><option value="">Choose a category</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      {student && <><Field label="Institution"><select required value={draft.institution} onChange={e => set('institution', e.target.value)}><option value="">Choose an institution</option><option value="University of Windsor">UWindsor</option><option>St. Clair College</option><option>Other</option></select></Field>{draft.institution === 'Other' && <Field label="Institution name"><input required maxLength={180} value={draft.otherInstitution} onChange={e => set('otherInstitution', e.target.value)} /></Field>}<Field label="Faculty or area of study"><select required value={draft.faculty} onChange={e => set('faculty', e.target.value)}><option value="">Choose a faculty or area</option>{FACULTIES.map(faculty => <option key={faculty}>{faculty}</option>)}</select></Field></>}
      {draft.category && !student && <><Field label={`Organisation${draft.category === 'sponsor' ? '' : ' (optional)'}`}><input required={draft.category === 'sponsor'} maxLength={180} value={draft.organisation} onChange={e => set('organisation', e.target.value)} /></Field><Field label="Role / title (optional)"><input maxLength={180} value={draft.role} onChange={e => set('role', e.target.value)} /></Field></>}
      <label className="attendance-admin__check attendance-admin__field--wide"><input type="checkbox" checked={draft.withTeam} onChange={e => set('withTeam', e.target.checked)} /><span>Attending with a team or organisation</span></label>
      {draft.withTeam && <Field label="Team or organisation name" wide><input required maxLength={180} value={draft.teamName} onChange={e => set('teamName', e.target.value)} /></Field>}
      {canViewSupport && <><Field label="Dietary requirements (optional; enter None if applicable)"><input maxLength={1000} value={draft.dietary} onChange={e => set('dietary', e.target.value)} /></Field><Field label="Accessibility or accommodation (optional)"><input maxLength={1000} value={draft.accessibility} onChange={e => set('accessibility', e.target.value)} /></Field></>}
      <fieldset className="attendance-admin__field--wide attendance-admin__event-choice"><legend>Events attended</legend>{events.filter(event => !['cancelled', 'completed'].includes(effectiveStatus(event))).map(event => <label className="attendance-admin__check" key={event.id}><input type="checkbox" disabled={event.status === 'closed'} checked={eventIds.includes(event.id)} onChange={e => setEventIds(previous => e.target.checked ? [...previous, event.id] : previous.filter(id => id !== event.id))} /><span>{event.title}<small>{displayTime(event.startsAt)} · {effectiveStatus(event) === 'full' ? 'Waitlist available' : effectiveStatus(event) === 'closed' && event.status !== 'closed' ? 'Public registration closed · Organiser walk-ins available' : effectiveStatus(event)}</small></span></label>)}</fieldset>
      <p className="attendance-admin__muted attendance-admin__field--wide">Organisers can record walk-ins after public registration automatically closes. Manually closed events must be reopened in Manage events first. Capacity limits still apply.</p>
      <label className="attendance-admin__check attendance-admin__field--wide"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} /><span>The attendee acknowledges: “I understand that Hult Prize at UWindsor will use my details to manage my event registrations and send essential event updates.”</span></label>
      <p className="attendance-admin__muted attendance-admin__field--wide">Broader marketing updates are not enabled when recording a walk-in.</p>
      <div className="attendance-admin__field--wide"><button type="submit" disabled={busy} className="btn btn--primary">{busy ? 'Saving…' : 'Save walk-in & check in confirmed events'}</button></div>
    </form>
  </section>
}

export default function AttendanceAdminPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [pending, setPending] = useState('initial')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<'roster' | 'events' | 'walkin' | 'email'>('roster')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showSupport, setShowSupport] = useState(false)
  const [exportSupport, setExportSupport] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    api<Dashboard>('admin').then(result => { if (active) setData(result) }).catch(failure => { if (active && !(failure instanceof RequestError && failure.status === 401)) setError(failure instanceof Error ? failure.message : 'Unable to load attendance.') }).finally(() => { if (active) setPending('') })
    return () => { active = false }
  }, [])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  async function refresh() {
    setPending('refresh'); setError(''); setNotice('')
    try { setData(await api<Dashboard>('admin')); setNotice('Attendance data refreshed.') } catch (failure) { handleError(failure) } finally { setPending('') }
  }
  function handleError(failure: unknown) {
    if (failure instanceof RequestError && failure.status === 401) { setData(null); setShowSupport(false); setExportSupport(false) }
    setError(failure instanceof Error ? failure.message : 'The request could not be completed. Please try again.')
  }
  async function mutate(action: string, body: object, message: string): Promise<Result | null> {
    setPending(action); setError(''); setNotice('')
    try {
      const result = await api<Result>(action, body)
      setNotice(`${action === 'sendUpdate' && result.queued !== undefined ? `${result.queued} event update emails queued.` : message}${result.notificationRequired ? ' The schedule or venue changed. Use “Email saved event update” to notify affected registrants.' : ''}`)
      try { setData(await api<Dashboard>('admin')) } catch (failure) { handleError(failure); setNotice(`${message} Refresh the dashboard to see the latest records.`) }
      return result
    } catch (failure) { handleError(failure); return null } finally { setPending('') }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending('login'); setError(''); setNotice('')
    try { await api('login', { password }); setPassword(''); setData(await api<Dashboard>('admin')) } catch (failure) { handleError(failure) } finally { setPending('') }
  }
  async function logout() {
    setPending('logout'); setError('')
    try { await api('logout', {}); setData(null); setTab('roster'); setShowSupport(false); setExportSupport(false); setFilters(EMPTY_FILTERS); setNotice('You have signed out.') } catch (failure) { handleError(failure) } finally { setPending('') }
  }
  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const people = new Map(data.attendees.map(person => [person.id, person]))
    const events = new Map(data.events.map(event => [event.id, event]))
    const checks = new Map(data.checkins.map(check => [check.registrationId, check]))
    return data.registrations.flatMap(registration => {
      const attendee = people.get(registration.attendeeId)
      const event = events.get(registration.eventId)
      return attendee && event ? [{ registration, attendee, event, checkin: checks.get(registration.id) }] : []
    }).sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt) || (a.attendee.lastName ?? '').localeCompare(b.attendee.lastName ?? '') || (a.attendee.firstName ?? '').localeCompare(b.attendee.firstName ?? ''))
  }, [data])
  const filtered = useMemo(() => rows.filter(({ event, attendee: a, registration: r, checkin }) => {
    const search = filters.search.trim().toLocaleLowerCase()
    return (!filters.eventIds.length || filters.eventIds.includes(event.id)) && (!filters.category || a.category === filters.category) && (!filters.institution || a.institution === filters.institution) && (!filters.faculty || a.faculty === filters.faculty) && (!filters.team || (a.teamName || a.organisation) === filters.team) && (!filters.status || (filters.status === 'checked-in' ? Boolean(checkin) : r.status === filters.status)) && (!search || [a.firstName, a.lastName, a.email, a.teamName, a.organisation].join(' ').toLocaleLowerCase().includes(search))
  }), [rows, filters])
  const people = [...new Map(filtered.map(row => [row.attendee.id, row.attendee])).values()]
  const counts = { confirmed: filtered.filter(row => row.registration.status === 'confirmed').length, waitlisted: filtered.filter(row => row.registration.status === 'waitlisted').length, offered: filtered.filter(row => row.registration.status === 'offered').length, cancelled: filtered.filter(row => row.registration.status === 'cancelled').length, checkedIn: filtered.filter(row => row.checkin).length }
  const optionValues = (field: 'institution' | 'faculty' | 'team') => [...new Set(rows.map(({ attendee }) => field === 'team' ? attendee.teamName || attendee.organisation : attendee[field]).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b))
  const failures = data?.deliveries.filter(delivery => delivery.status === 'failed' || delivery.status === 'pending' && (delivery.lastError || delivery.error)) ?? []
  const busy = Boolean(pending)
  const setFilter = (key: keyof Filters, value: string | string[]) => setFilters(previous => ({ ...previous, [key]: value }))

  return <div className="attendance-admin">
    <TopBar actions={data && <div className="attendance-admin__actions"><button type="button" className="btn btn--outline" disabled={busy} onClick={refresh}>Refresh</button><button type="button" className="btn btn--dark" disabled={busy} onClick={logout}>Sign out</button></div>} />
    <div className="container">
    {data && <header className="attendance-admin__heading"><h1>Attendance</h1><p className="attendance-admin__access">{data.canViewSupport ? 'Attendance support access' : 'General organiser access · Dietary and accessibility details are restricted'} · All times are Windsor time (America/Toronto).</p></header>}
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className="attendance-admin__error">{error}</div>}
    <div role="status" aria-live="polite" className={notice ? 'attendance-admin__notice' : 'visually-hidden'}>{notice}</div>
    {pending === 'initial' || !data ? <section className="attendance-admin__login" aria-labelledby="organiser-login"><h1 id="organiser-login">Organiser sign in</h1>{pending === 'initial' ? <p role="status" className="attendance-admin__loading">Checking organiser access…</p> : <><p>Use your organiser password. Dietary and accessibility details need separate support access.</p><form onSubmit={login}><Field label="Organiser password"><input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field><button className="btn btn--primary" disabled={busy} type="submit">{pending === 'login' ? 'Signing in…' : 'Sign in'}</button></form><a href="/attend">Go to public event registration</a></>}</section> : <>
      <nav className="attendance-admin__nav" aria-label="Attendance dashboard sections">{([['roster', 'Rosters & reports'], ['walkin', 'Record a walk-in'], ['events', 'Manage events'], ['email', `Email delivery${failures.length ? ` (${failures.length} ${failures.length === 1 ? 'issue' : 'issues'})` : ''}`]] as const).map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{label}</button>)}</nav>
      {tab === 'roster' && <>
        <section className="attendance-admin__panel" aria-labelledby="roster-filters"><div className="attendance-admin__section-head"><h2 id="roster-filters">Find your attendees</h2><button type="button" className="attendance-admin__text-button" onClick={() => setFilters(EMPTY_FILTERS)}>Reset filters</button></div>
          <div className="attendance-admin__filters"><Field label="Search names, emails, teams or organisations" wide><input type="search" value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="Start typing to search" /></Field><Field label="Category"><select value={filters.category} onChange={e => setFilter('category', e.target.value)}><option value="">All categories</option>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>{(['institution', 'faculty', 'team'] as const).map(key => <Field key={key} label={key === 'team' ? 'Team / organisation' : key === 'faculty' ? 'Faculty / area of study' : 'Institution'}><select value={filters[key]} onChange={e => setFilter(key, e.target.value)}><option value="">All {key === 'team' ? 'teams / organisations' : key === 'faculty' ? 'faculties / areas' : 'institutions'}</option>{optionValues(key).map(value => <option key={value}>{value}</option>)}</select></Field>)}<Field label="Registration / check-in status"><select value={filters.status} onChange={e => setFilter('status', e.target.value)}><option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="waitlisted">Waitlisted</option><option value="offered">Seat offered</option><option value="cancelled">Cancelled</option><option value="checked-in">Actually checked in</option></select></Field></div>
          <details className="attendance-admin__event-filter"><summary>Events: {filters.eventIds.length ? `${filters.eventIds.length} selected` : 'all events'} <span>Select one or several</span></summary><fieldset className="attendance-admin__event-choice"><legend className="visually-hidden">Filter events; leave all unchecked to include every event</legend>{data.events.map(event => <label className="attendance-admin__check" key={event.id}><input type="checkbox" checked={filters.eventIds.includes(event.id)} onChange={e => setFilter('eventIds', e.target.checked ? [...filters.eventIds, event.id] : filters.eventIds.filter(id => id !== event.id))} /><span>{event.title}<small>{displayTime(event.startsAt)}</small></span></label>)}</fieldset></details>
        </section>
        <div className="attendance-admin__stats" aria-label="Attendance totals for current filters">{[[people.length, 'Unique people'], [filtered.length, 'Event registrations'], [counts.confirmed, 'Confirmed'], [counts.waitlisted, 'Waitlisted'], [counts.offered, 'Seat offers'], [counts.cancelled, 'Cancelled'], [counts.checkedIn, 'Actual check-ins']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <p className="attendance-admin__muted">Counts reflect your filters, including cancelled records unless filtered out. One person attending five events is one unique person and five registrations. Check-ins record actual attendance.</p>
        <div className="attendance-admin__breakdowns"><Breakdown title="Selected attendee categories" people={people} getValue={person => categoryLabel(person.category)} /><Breakdown title="Institutions" people={people} getValue={person => person.institution || ''} /><Breakdown title="Faculties / areas of study" people={people} getValue={person => person.faculty || ''} /><Breakdown title="Teams / organisations" people={people} getValue={person => person.teamName || person.organisation || ''} /></div>
        <section className="attendance-admin__panel" aria-labelledby="event-totals"><h2 id="event-totals">Event totals</h2><p className="attendance-admin__muted">Counts use the current filters. Category columns count unique people across the selected registration statuses.</p><div className="attendance-admin__table-wrap" role="region" aria-label="Per-event attendance totals" tabIndex={0}><table><thead><tr><th scope="col">Event</th><th scope="col">Confirmed</th><th scope="col">Waitlisted</th><th scope="col">Offered</th><th scope="col">Cancelled</th><th scope="col">Check-ins</th><th scope="col">Undergrad</th><th scope="col">Graduate</th><th scope="col">Other categories</th></tr></thead><tbody>{data.events.filter(event => !filters.eventIds.length || filters.eventIds.includes(event.id)).map(event => { const eventRows = filtered.filter(row => row.event.id === event.id); const attendees = [...new Map(eventRows.map(row => [row.attendee.id, row.attendee])).values()]; return <tr key={event.id}><th scope="row">{event.title}</th>{(['confirmed', 'waitlisted', 'offered', 'cancelled'] as const).map(status => <td key={status}>{eventRows.filter(row => row.registration.status === status).length}</td>)}<td>{eventRows.filter(row => row.checkin).length}</td><td>{attendees.filter(a => a.category === 'undergraduate').length}</td><td>{attendees.filter(a => a.category === 'graduate').length}</td><td>{attendees.filter(a => !['undergraduate', 'graduate'].includes(a.category)).length}</td></tr> })}</tbody></table></div></section>
        <section className="attendance-admin__panel" aria-labelledby="attendance-roster"><div className="attendance-admin__section-head"><div><h2 id="attendance-roster">Attendee roster</h2><p>{filtered.length} registrations · {people.length} unique people</p></div><button className="btn btn--primary" type="button" disabled={!filtered.length} onClick={() => exportRoster(filtered, data.canViewSupport && exportSupport)}>Export filtered CSV</button></div><p className="attendance-admin__muted">Select one event for its door roster, or several for a combined export. Contact details are for event operations and must not be shared with sponsors or partners.</p>
          {data.canViewSupport && <div className="attendance-admin__support-controls"><label className="attendance-admin__check"><input type="checkbox" checked={showSupport} onChange={e => setShowSupport(e.target.checked)} /><span>Show dietary and accessibility details</span></label><label className="attendance-admin__check"><input type="checkbox" checked={exportSupport} onChange={e => setExportSupport(e.target.checked)} /><span>Include support details in this export for authorised attendance preparation</span></label></div>}
          {!filtered.length ? <p className="attendance-admin__empty">No registrations match these filters.</p> : <div className="attendance-admin__table-wrap" role="region" aria-label="Attendee roster" tabIndex={0}><table><thead><tr><th scope="col">Attendee</th><th scope="col">Category / affiliation</th><th scope="col">Event</th><th scope="col">Registration</th><th scope="col">Actual attendance</th>{data.canViewSupport && showSupport && <th scope="col">Attendance support</th>}</tr></thead><tbody>{filtered.map(({ registration, attendee, event, checkin }) => <tr key={registration.id}><th scope="row"><strong>{personName(attendee)}</strong><span className="attendance-admin__table-detail">{attendee.email}</span>{(attendee.teamName || attendee.organisation) && <span className="attendance-admin__table-detail">{attendee.teamName || attendee.organisation}</span>}</th><td>{categoryLabel(attendee.category)}{attendee.institution && <span className="attendance-admin__table-detail">{attendee.institution}</span>}{attendee.faculty && <span className="attendance-admin__table-detail">{attendee.faculty}</span>}</td><td>{event.title}<span className="attendance-admin__table-detail">{displayTime(event.startsAt)}</span></td><td><Status status={registration.status} /></td><td>{checkin ? <><strong className="attendance-admin__checked">Checked in</strong><span className="attendance-admin__table-detail">{displayTime(checkin.checkedInAt)}</span></> : registration.status === 'confirmed' && event.status !== 'cancelled' ? <button type="button" disabled={busy} className="btn btn--outline attendance-admin__checkin" aria-label={`Check in ${personName(attendee)} for ${event.title}`} onClick={() => mutate('checkIn', { registrationId: registration.id }, `${personName(attendee)} checked in for ${event.title}.`)}>Check in</button> : <span className="attendance-admin__muted">Not checked in</span>}</td>{data.canViewSupport && showSupport && <td><span className="attendance-admin__table-detail"><strong>Dietary:</strong> {attendee.dietary || 'Not supplied'}</span><span className="attendance-admin__table-detail"><strong>Accessibility:</strong> {attendee.accessibility || 'Not supplied'}</span></td>}</tr>)}</tbody></table></div>}
        </section>
      </>}
      {tab === 'events' && <section aria-labelledby="manage-events"><div className="attendance-admin__section-head"><div><h2 id="manage-events">Manage event details</h2><p>Leave capacity blank until a venue limit is confirmed. Registration closes at the start unless late registration is enabled.</p></div></div>{data.events.map(event => <EventEditor key={event.id} event={event} busy={busy} onSave={updated => mutate('saveEvent', { event: updated }, 'Event details saved.')} onUpdate={() => { void mutate('sendUpdate', { eventId: event.id }, `Event update queued for ${event.title}.`) }} />)}</section>}
      {tab === 'walkin' && <WalkInForm events={data.events} canViewSupport={data.canViewSupport} busy={busy} onSave={body => mutate('walkIn', body, 'Walk-in saved. Confirmed event registrations have been checked in; review any waitlisted events in the roster.')} />}
      {tab === 'email' && <section className="attendance-admin__panel" aria-labelledby="delivery-heading"><h2 id="delivery-heading">Email delivery</h2><p>Failed emails do not remove registrations. Retrying sends the recorded message without creating another registration. Blocked pending messages are listed here too; configuration issues require the site maintainer.</p><div className="attendance-admin__delivery-counts">{['pending', 'sent', 'failed', 'skipped'].map(status => <span key={status}><strong>{data.deliveries.filter(delivery => delivery.status === status).length}</strong> <span>{status[0].toUpperCase() + status.slice(1)}</span></span>)}</div>{!failures.length ? <p className="attendance-admin__empty">No delivery issues.</p> : <div className="attendance-admin__table-wrap" role="region" aria-label="Email delivery issues" tabIndex={0}><table><thead><tr><th scope="col">Recipient</th><th scope="col">Message</th><th scope="col">Delivery issue</th><th scope="col">Action</th></tr></thead><tbody>{failures.map(delivery => { const attendee = data.attendees.find(person => person.id === delivery.attendeeId); const event = data.events.find(item => item.id === delivery.eventId); return <tr key={delivery.id}><th scope="row">{attendee ? personName(attendee) : 'Recipient'}<span className="attendance-admin__table-detail">{attendee?.email}</span></th><td>{delivery.type || delivery.kind || 'Event email'}{event && <span className="attendance-admin__table-detail">{event.title}</span>}</td><td><Status status={delivery.status} /><span className="attendance-admin__table-detail">{delivery.lastError || delivery.error || 'Delivery failed. Retry or check the email service configuration.'}</span>{delivery.attempts !== undefined && <span className="attendance-admin__table-detail">{delivery.attempts} {delivery.attempts === 1 ? 'attempt' : 'attempts'}</span>}</td><td><button type="button" className="btn btn--outline" disabled={busy} onClick={() => mutate('retryEmail', { deliveryId: delivery.id }, 'Email queued for another delivery attempt.')}>Retry email</button></td></tr> })}</tbody></table></div>}</section>}
    </>}
  </div></div>
}
