import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from '../components/PageLink'
import { PageLayout, Section } from '../components/PageParts'
import { scrollPageTo } from '../components/useSmoothScroll'
import { SITE } from '../data/site'
import { AttendanceApiError, attendanceApi, canSelectEvent } from '../lib/attendance'
import type { AttendanceRegistration, ManageAttendanceResponse } from '../lib/attendance'
import { EventSelection, RegistrationCards } from './AttendPage'
import './Attendance.css'

type EmailCredential = { action: 'exchange' | 'acceptOffer'; token: string; add: string[] }

function captureEmailCredential(): EmailCredential | null {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/attend/manage')) return null
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const token = hash.get('token')
  const offer = hash.get('offer')
  if (!token && !offer) return null
  // Bearer tokens only travel in the POST body; remove the fragment before rendering links.
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  // The thank-you email's sign-up button names the next event, to tick it in "Add another event".
  const add = (hash.get('add') || '').split(',').filter(id => /^[a-zA-Z0-9_-]{1,100}$/.test(id)).slice(0, 30)
  return offer ? { action: 'acceptOffer', token: offer, add: [] } : { action: 'exchange', token: token!, add }
}

let initialCredential = captureEmailCredential()

export default function ManageAttendancePage() {
  const [credential] = useState(() => initialCredential || captureEmailCredential())
  const [snapshot, setSnapshot] = useState<ManageAttendanceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [dietary, setDietary] = useState('')
  const [accessibility, setAccessibility] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [addHint, setAddHint] = useState('')
  const [cancelTarget, setCancelTarget] = useState<AttendanceRegistration | null>(null)
  const [revision, setRevision] = useState(0)
  const bootstrap = useRef<Promise<ManageAttendanceResponse> | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLDivElement>(null)
  const jumpToAdd = useRef(false)

  function applySnapshot(next: ManageAttendanceResponse) {
    setSnapshot(next)
    setDietary(next.attendee.dietary || '')
    setAccessibility(next.attendee.accessibility || '')
  }

  useEffect(() => {
    let active = true
    if (!bootstrap.current) {
      if (credential) {
        initialCredential = null
        bootstrap.current = attendanceApi<ManageAttendanceResponse>(credential.action, { token: credential.token }).then(result => result.attendee && result.registrations ? result : attendanceApi<ManageAttendanceResponse>('manage'))
          // A management link already used in this browser still opens the page while that sign-in lasts.
          .catch(failure => credential.action === 'exchange' ? attendanceApi<ManageAttendanceResponse>('manage').catch(() => { throw failure }) : Promise.reject(failure))
      } else bootstrap.current = attendanceApi<ManageAttendanceResponse>('manage')
    }
    bootstrap.current.then(result => {
      if (!active) return
      applySnapshot(result)
      if (credential?.action === 'acceptOffer') setMessage('Your offered seat is now confirmed. Your current registrations are shown below.')
      const wanted = credential?.add || []
      const listed = wanted.filter(id => result.registrations.some(registration => registration.eventId === id && registration.status !== 'cancelled'))
      const add = wanted.filter(id => !listed.includes(id) && result.events.some(event => event.id === id && canSelectEvent(event)))
      if (wanted.length) {
        setSelected(add)
        setAddHint(add.length ? `${add.length === 1 ? 'Your next event is' : 'These events are'} ticked below. Press “Add selected events” to save your spot.`
          : listed.length ? 'You’re already on the list for that event. You’ll find it under “Your registrations”.'
          : 'Registration for that event has closed, but you can still add any event below.')
        jumpToAdd.current = true
      }
    }).catch(failure => {
      if (!active) return
      if (credential || !(failure instanceof AttendanceApiError) || failure.status !== 401) {
        setError(failure instanceof Error ? failure.message : 'We could not open your attendance. Request a new email link below.')
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [credential, revision])

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => {
    if (!jumpToAdd.current || loading) return
    jumpToAdd.current = false
    const target = document.getElementById('add-an-event')
    if (target) scrollPageTo(target.getBoundingClientRect().top + window.scrollY - 28)
  }, [loading])
  useEffect(() => { if (cancelTarget) cancelRef.current?.focus() }, [cancelTarget])

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await attendanceApi('requestLink', { email })
      setMessage('If this address has event registrations, a secure link will arrive by email. Please check your inbox and spam folder. For privacy, we cannot confirm registrations here.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not request your email link. Please try again.')
    } finally { setBusy(false) }
  }

  async function changeAttendance(action: string, body: object, successMessage: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await attendanceApi<ManageAttendanceResponse>(action, body)
      applySnapshot(result)
      if (action === 'addEvents') { setSelected([]); setAddHint('') }
      setCancelTarget(null)
      setMessage(successMessage)
    } catch (failure) {
      if (failure instanceof AttendanceApiError && failure.status === 401) setSnapshot(null)
      setError(failure instanceof Error ? failure.message : 'We could not save this change. Please try again.')
    } finally { setBusy(false) }
  }

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      await attendanceApi('logout')
      setSnapshot(null)
      setDietary('')
      setAccessibility('')
      setEmail('')
      setSelected([])
      setAddHint('')
      setCancelTarget(null)
      setMessage('You’re signed out. Request a new secure email link whenever you need to manage your attendance.')
      bootstrap.current = null
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not sign you out. Please try again.')
    } finally { setBusy(false) }
  }

  const registrations = snapshot?.registrations || []
  const events = snapshot?.events || []
  const available = events.filter(event => canSelectEvent(event) && !registrations.some(registration => registration.eventId === event.id && registration.status !== 'cancelled'))
  const cancellationEvent = cancelTarget && (cancelTarget.event || events.find(event => event.id === cancelTarget.eventId))

  return <PageLayout className="attendance-page attendance-manage-page" title="Manage attendance" subtitle="Your events. Your plans. Update them here.">
    <Section>
      <meta name="referrer" content="no-referrer" />
      <div className="attendance-manage-intro"><div className="attendance-actions"><Link to="/attend">← Attend our events</Link>{snapshot && <button type="button" className="attendance-text-button" onClick={signOut} disabled={busy}>Sign out of attendance</button>}</div><p>View your registrations, add another event, or let us know if your plans change.</p></div>
      {error && <div className="attendance-notice attendance-notice--error" role="alert" tabIndex={-1} ref={errorRef}>{error}</div>}
      {message && <div className="attendance-notice attendance-notice--success" role="status">{message}</div>}
      {loading ? <p className="attendance-notice" role="status">Opening your secure attendance page…</p> : snapshot ? <>
        <section className="attendance-manage-section" aria-labelledby="your-registrations">
          <p className="eyebrow">Welcome, {snapshot.attendee.firstName}</p>
          <h2 id="your-registrations">Your registrations</h2>
          <p>Each event has its own attendance status. A waitlist place becomes confirmed only after you accept a seat offer by email.</p>
          {cancelTarget && <div className="attendance-cancel-confirm" role="group" aria-labelledby="cancel-registration-title" tabIndex={-1} ref={cancelRef}>
            <h3 id="cancel-registration-title">Cancel {cancellationEvent?.title || 'this registration'}?</h3>
            <p>Your place will be released. You can register again while registration remains open, subject to availability.</p>
            <div className="attendance-actions"><button type="button" className="btn btn--dark" disabled={busy} onClick={() => changeAttendance('cancel', { registrationId: cancelTarget.id }, 'Your registration has been cancelled. Your other events are unchanged.')}>{busy ? 'Cancelling…' : 'Yes, cancel this event'}</button><button type="button" className="attendance-text-button" disabled={busy} onClick={() => setCancelTarget(null)}>Keep my registration</button></div>
          </div>}
          {registrations.length ? <RegistrationCards registrations={registrations} events={events} onCancel={setCancelTarget} busy={busy} /> : <p>You have no current event registrations. Choose an available event below.</p>}
        </section>
        <section className="attendance-manage-section" aria-labelledby="add-an-event">
          <h2 id="add-an-event">Add another event</h2>
          {addHint && <p className="attendance-notice attendance-notice--success" role="status">{addHint}</p>}
          {available.length ? <form onSubmit={event => { event.preventDefault(); if (!selected.length) { setError('Choose at least one event to add.'); return }; void changeAttendance('addEvents', { eventIds: selected }, 'Your events have been updated. Check each event’s confirmed or waitlisted status above.') }}>
            <EventSelection events={available} selected={selected} onChange={setSelected} disabled={busy} idPrefix="manage" />
            <p className="attendance-live-summary" aria-live="polite">{selected.length} event{selected.length === 1 ? '' : 's'} selected.</p>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Add selected events'} <span aria-hidden="true">→</span></button>
          </form> : <p>There are no other events available to add right now.</p>}
        </section>
        <section className="attendance-manage-section" aria-labelledby="attendance-support">
          <h2 id="attendance-support">Help us prepare for you</h2>
          <p>Share only the information needed to support your attendance.</p>
          <form onSubmit={event => { event.preventDefault(); void changeAttendance('updateDetails', { dietary, accessibility }, 'Your dietary and accessibility details have been saved.') }}>
            <div className="attendance-fields"><label className="attendance-field-wide">Dietary requirements <span>(optional)</span><input name="dietary" maxLength={500} value={dietary} disabled={busy} onChange={event => setDietary(event.target.value)} placeholder="None, or tell us what to prepare" /></label><label className="attendance-field-wide">Accessibility or accommodation requests <span>(optional)</span><textarea name="accessibility" rows={3} maxLength={1000} value={accessibility} disabled={busy} onChange={event => setAccessibility(event.target.value)} /></label></div>
            <button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save support details'}</button>
          </form>
        </section>
        <p className="attendance-help">Need to correct your name or email? Contact <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>. <Link to="/privacy">Event registration privacy notice</Link>.</p>
      </> : <section className="attendance-link-request" aria-labelledby="email-link-title">
        <h2 id="email-link-title">A secure link, sent to you.</h2>
        <p>Enter the email address used for your registration. We’ll send an expiring link so you can manage your attendance without an account or password.</p>
        <form onSubmit={requestLink}><label>Email address <span>(required)</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label><button type="submit" className="btn btn--primary" disabled={busy}>{busy ? 'Requesting your link…' : 'Email my secure link'} <span aria-hidden="true">→</span></button></form>
        <p className="attendance-help">Management links are private and expire. Use a new link if an earlier one has expired or has already been used.</p>
        {error && <button className="attendance-text-button" type="button" disabled={busy} onClick={() => { setError(''); setLoading(true); bootstrap.current = attendanceApi<ManageAttendanceResponse>('manage'); setRevision(value => value + 1) }}>Try my current session again</button>}
      </section>}
    </Section>
  </PageLayout>
}
