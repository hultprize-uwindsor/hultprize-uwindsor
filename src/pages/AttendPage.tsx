import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from '../components/PageLink'
import { PageLayout, Section } from '../components/PageParts'
import { SITE } from '../data/site'
import {
  CATEGORY_OPTIONS, GROUP_LABELS, REGISTRATION_STATUS_LABELS,
  attendanceApi, canSelectEvent, downloadCalendar, eventDate, eventStatus, eventStatusLabel,
  eventTime, googleCalendarUrl, outlookCalendarUrl, teamRegistrationUrl, useAttendanceEvents,
} from '../lib/attendance'
import type { AttendanceEvent, AttendanceRegistration, AttendeeCategory, AttendeeDetails, RegistrationResponse } from '../lib/attendance'
import './Attendance.css'

const FACULTIES = ['Arts, Humanities and Social Sciences', 'Business', 'Education', 'Engineering', 'Human Kinetics', 'Law', 'Nursing', 'Science', 'Other', 'Undecided / not applicable']
const REFERRALS = ['Class presentation', 'VentureU', 'Innovation Fellowship', 'Outstanding Scholars', 'Friend / team', 'Social media', 'Partner organisation', 'Other']

function initialDetails(): AttendeeDetails {
  const teamName = new URLSearchParams(window.location.search).get('team')?.slice(0, 160) || ''
  return { firstName: '', lastName: '', email: '', category: '', institution: '', faculty: '', organisation: '', role: '', withTeam: Boolean(teamName), teamName, dietary: '', accessibility: '', referral: '' }
}

function initialSelection() {
  return [...new Set((new URLSearchParams(window.location.search).get('events') || '').split(',').filter(Boolean))].slice(0, 30)
}

export function CalendarActions({ event }: { event: AttendanceEvent }) {
  return <div className="attendance-calendar" aria-label={`Add ${event.title} to your calendar`}>
    <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Google Calendar <span aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span></a>
    <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Outlook <span aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span></a>
    <button type="button" onClick={() => downloadCalendar(event)}>Apple / other (.ics) <span aria-hidden="true">↓</span></button>
  </div>
}

export function EventSelection({ events, selected, onChange, disabled = false, idPrefix = 'attendance' }: { events: AttendanceEvent[]; selected: string[]; onChange: (ids: string[]) => void; disabled?: boolean; idPrefix?: string }) {
  const workshops = events.filter(event => event.group === 'workshops' && canSelectEvent(event))
  const allWorkshopsSelected = workshops.length > 0 && workshops.every(event => selected.includes(event.id))
  return <>
    <div className="attendance-event-tools">
      <p>All times are local to Windsor, Ontario (America/Toronto).</p>
      <button className="attendance-text-button" type="button" disabled={disabled || workshops.length === 0} aria-pressed={allWorkshopsSelected} onClick={() => onChange(allWorkshopsSelected ? selected.filter(id => !workshops.some(event => event.id === id)) : [...new Set([...selected, ...workshops.map(event => event.id)])])}>
        {allWorkshopsSelected ? 'Deselect workshops' : workshops.length === 5 ? 'Select all five workshops' : `Select available workshops (${workshops.length})`}
      </button>
    </div>
    <div className="attendance-event-list">
      {[...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(event => {
        const selectedEvent = selected.includes(event.id)
        const unavailable = !canSelectEvent(event)
        const status = eventStatus(event)
        return <label key={event.id} className={`attendance-event-card${selectedEvent ? ' is-selected' : ''}${unavailable ? ' is-unavailable' : ''}`} htmlFor={`${idPrefix}-${event.id}`}>
          <input type="checkbox" id={`${idPrefix}-${event.id}`} checked={selectedEvent} disabled={disabled || unavailable} aria-describedby={`${idPrefix}-${event.id}-status`} onChange={eventChange => onChange(eventChange.target.checked ? [...selected, event.id] : selected.filter(id => id !== event.id))} />
          <span className="attendance-event-content">
            <span className={`attendance-group attendance-group--${event.group}`}>{GROUP_LABELS[event.group]}</span>
            <strong className="attendance-event-title">{event.title}</strong>
            <span className="attendance-event-date"><time dateTime={event.startsAt}>{eventDate(event)}</time><span>{eventTime(event)}</span></span>
            <span className="attendance-event-venue">{event.venue}</span>
            <span className="attendance-event-description">{event.description}</span>
            <span className="attendance-event-bottom"><span>Free · Drinks and snacks provided</span><span id={`${idPrefix}-${event.id}-status`} className={`attendance-status attendance-status--${status}`}>{eventStatusLabel(event)}</span></span>
          </span>
        </label>
      })}
    </div>
  </>
}

export function RegistrationCards({ registrations, events, onCancel, busy = false }: { registrations: AttendanceRegistration[]; events: AttendanceEvent[]; onCancel?: (registration: AttendanceRegistration) => void; busy?: boolean }) {
  return <div className="attendance-registration-list">{registrations.map(registration => {
    const event = registration.event || events.find(item => item.id === registration.eventId)
    if (!event) return <article className="attendance-registration" key={registration.id}><h3>Event registration</h3><p>{REGISTRATION_STATUS_LABELS[registration.status]}</p></article>
    return <article className="attendance-registration" key={registration.id}>
      <div className="attendance-registration-heading"><h3>{event.title}</h3><span className={`attendance-status attendance-status--${registration.status}`}>{REGISTRATION_STATUS_LABELS[registration.status]}</span></div>
      <p className="attendance-registration-date"><time dateTime={event.startsAt}>{eventDate(event)}</time><br />{eventTime(event)} · Windsor time</p>
      <p>{event.venue}</p>
      {event.status === 'cancelled' && <p className="attendance-notice">This event has been cancelled. Please check your email for the organiser’s update.</p>}
      {registration.status === 'waitlisted' && <p className="attendance-help">Your place is on the waitlist. If a seat becomes available, we will email an offer with a deadline to accept it.</p>}
      {registration.status === 'offered' && <p className="attendance-help">Open the seat offer in your email to accept before it expires. Your place is not confirmed until you accept.</p>}
      {registration.status === 'confirmed' && event.status !== 'cancelled' && <CalendarActions event={event} />}
      {onCancel && registration.status !== 'cancelled' && <button className="attendance-text-button attendance-cancel" type="button" disabled={busy} onClick={() => onCancel(registration)}>Cancel this registration<span className="visually-hidden"> for {event.title}</span></button>}
    </article>
  })}</div>
}

function Confirmation({ receipt, events, email, selectedIds, teamName }: { receipt: RegistrationResponse; events: AttendanceEvent[]; email: string; selectedIds: string[]; teamName: string }) {
  const [copied, setCopied] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const registrations = receipt.registrations || []
  const confirmed = registrations.filter(item => item.status === 'confirmed').length
  const waiting = registrations.filter(item => item.status === 'waitlisted').length
  const shareUrl = teamRegistrationUrl(selectedIds, teamName)
  useEffect(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: 'start' }) }, [])
  async function sendLink() {
    setLinkBusy(true)
    setLinkMessage('')
    try {
      await attendanceApi('requestLink', { email })
      setLinkMessage('If this address has registrations, a secure link will arrive by email. Please check your spam folder too.')
    } catch (error) {
      setLinkMessage(error instanceof Error ? error.message : 'We could not request your email link. Please try again.')
    } finally { setLinkBusy(false) }
  }
  return <section className="attendance-confirmation" aria-labelledby="registration-confirmation">
    <p className="eyebrow">{receipt.verificationRequired ? 'Check your inbox' : 'Your attendance'}</p>
    <h2 ref={heading} tabIndex={-1} id="registration-confirmation">{receipt.verificationRequired ? 'Check your email to continue.' : waiting === registrations.length ? 'You’re on the waitlist.' : waiting ? 'You’re registered, with a waitlist too.' : 'You’re registered!'}</h2>
    {receipt.verificationRequired ? <p>We’ve sent the next step to your email, if it is eligible. Use that secure link to view or change registrations. Your selections are only confirmed when they appear in your verified attendance page.</p> : <>
      <p className="attendance-confirmation-name">{receipt.attendee?.firstName} {receipt.attendee?.lastName}</p>
      <p>Your registration is saved. {confirmed > 0 && `${confirmed} event${confirmed === 1 ? '' : 's'} confirmed.`} {waiting > 0 && `${waiting} event${waiting === 1 ? '' : 's'} waitlisted.`} Check your email for your confirmation and secure management link.</p>
      <RegistrationCards registrations={registrations} events={events} />
    </>}
    <div className="attendance-confirmation-next">
      <h3>Manage your attendance</h3>
      <p>Use the secure link in your email to add events, cancel individual registrations or update dietary and accessibility details.</p>
      <div className="attendance-actions"><Link className="btn btn--secondary" to="/attend/manage">Manage attendance <span aria-hidden="true">→</span></Link><button type="button" className="attendance-text-button" disabled={linkBusy} onClick={sendLink}>{linkBusy ? 'Requesting link…' : 'Send a new email link'}</button></div>
      {linkMessage && <p role="status">{linkMessage}</p>}
    </div>
    <div className="attendance-share">
      <h3>Bring your team</h3>
      <p>Share this link so each member can register for the events they will attend. Each person needs their own registration, including sponsor representatives.</p>
      <label htmlFor="team-share-link">Your team’s registration link</label>
      <div className="attendance-copy-row"><input id="team-share-link" readOnly value={shareUrl} onFocus={event => event.target.select()} /><button className="btn btn--dark" type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true) } catch { document.getElementById('team-share-link')?.focus() }
      }}>{copied ? 'Copied' : 'Copy link'}</button></div>
      <p className="attendance-help">The link contains event choices{teamName ? ' and your team name' : ''}. It does not include your contact details.</p>
    </div>
    <div className="attendance-next-links">{SITE.discordUrl && <a href={SITE.discordUrl} target="_blank" rel="noopener noreferrer">Join our Discord ↗</a>}<a href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">Register your team to compete ↗</a></div>
    <p className="attendance-help">Competition registration is separate and closes November 20, 2026. Grand Finale attendance does not reserve a pitching slot.</p>
  </section>
}

export default function AttendPage() {
  const { search } = useLocation()
  const { events, loading, live, error: availabilityError, refresh } = useAttendanceEvents()
  const [details, setDetails] = useState(initialDetails)
  const [institutionChoice, setInstitutionChoice] = useState('')
  const [selected, setSelected] = useState(initialSelection)
  const [consent, setConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<RegistrationResponse | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef({ fingerprint: '', id: '' })
  const previousSearch = useRef(search)
  const student = ['undergraduate', 'graduate', 'other-student'].includes(details.category)
  const selectedEvents = events.filter(event => selected.includes(event.id) && canSelectEvent(event))
  const selectedIds = selectedEvents.map(event => event.id)
  const waitlisted = selectedEvents.filter(event => eventStatus(event) === 'full').length
  const setField = <Key extends keyof AttendeeDetails>(key: Key, value: AttendeeDetails[Key]) => setDetails(previous => ({ ...previous, [key]: value }))
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => {
    if (previousSearch.current === search) return
    previousSearch.current = search
    const params = new URLSearchParams(search)
    const incoming = (params.get('events') || '').split(',').filter(Boolean).slice(0, 30)
    // Synchronise changed router query parameters while preserving the visitor’s draft.
    // oxlint-disable-next-line react/set-state-in-effect
    setSelected(previous => [...new Set([...previous, ...incoming])])
    const teamName = params.get('team')?.slice(0, 160)
    // oxlint-disable-next-line react/set-state-in-effect
    if (teamName) setDetails(previous => previous.teamName ? previous : { ...previous, withTeam: true, teamName })
  }, [search])

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (!live) { setError('Registration is unavailable right now. No registration has been submitted. Please try again later.'); return }
    if (!selectedIds.length) { setError('Choose at least one available event before registering.'); return }
    const attendee = { ...details, institution: student ? details.institution : '', faculty: student ? details.faculty : '', organisation: student ? '' : details.organisation, role: student ? '' : details.role, teamName: details.withTeam ? details.teamName : '' }
    const body = { attendee, eventIds: selectedIds, consent, marketingConsent, website }
    const fingerprint = JSON.stringify(body)
    if (requestRef.current.fingerprint !== fingerprint) requestRef.current = { fingerprint, id: crypto.randomUUID() }
    setBusy(true)
    try {
      const result = await attendanceApi<RegistrationResponse>('register', { ...body, requestId: requestRef.current.id })
      if (result.verificationRequired || (result.saved && result.registrations?.length)) setReceipt(result)
      else throw new Error('We could not confirm that your registration was saved. Please retry or contact the organising team.')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'We could not confirm your registration. Your entries are still here; please try again.')
      refresh()
    } finally { setBusy(false) }
  }

  return <PageLayout className="attendance-page" title="Attend our events" subtitle="One idea. Four minutes. $1,000,000.">
    <Section>
      {receipt ? <Confirmation receipt={receipt} events={events} email={details.email} selectedIds={selectedIds} teamName={details.withTeam ? details.teamName : ''} /> : <>
        <div className="attendance-intro"><p className="eyebrow">Free events · Open to every faculty</p><h2>Come learn, connect and build.</h2><p>Register for one or more Hult Prize at UWindsor events below. Our events and workshops are free and open to students across all faculties, whether or not you compete. Drinks and snacks are provided.</p></div>
        <div className="attendance-competition"><p><strong>Want to pitch in the competition?</strong> Event registration does not register your team to compete. Complete your <a href={SITE.registrationUrl} target="_blank" rel="noopener noreferrer">competition registration separately <span aria-hidden="true">↗</span></a> by <strong>November 20, 2026</strong>.</p></div>
        <div className="attendance-form-top"><p>Fields marked “required” are needed to register.</p><Link to="/attend/manage">Already registered? Manage attendance →</Link></div>
        <form className="attendance-form" onSubmit={register}>
          <fieldset className="attendance-step" disabled={busy}>
            <legend><span className="attendance-step-number" aria-hidden="true">01</span>Your details</legend>
            <div className="attendance-fields">
              <label>First name <span>(required)</span><input name="firstName" autoComplete="given-name" required maxLength={100} value={details.firstName} onChange={event => setField('firstName', event.target.value)} /></label>
              <label>Last name <span>(required)</span><input name="lastName" autoComplete="family-name" required maxLength={100} value={details.lastName} onChange={event => setField('lastName', event.target.value)} /></label>
              <label className="attendance-field-wide">Email address <span>(required)</span><input name="email" type="email" autoComplete="email" required maxLength={254} value={details.email} onChange={event => setField('email', event.target.value)} /><span className="attendance-help">University and personal email addresses are welcome. We’ll send your secure management link here.</span></label>
              <label className="attendance-field-wide">Attendee category <span>(required)</span><select name="category" required value={details.category} onChange={event => setField('category', event.target.value as AttendeeCategory)}><option value="">Choose a category</option>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              {student && <>
                <label>Institution <span>(required)</span><select name="institutionChoice" required value={institutionChoice} onChange={event => { setInstitutionChoice(event.target.value); setField('institution', event.target.value === 'other' ? '' : event.target.value) }}><option value="">Choose your institution</option><option value="University of Windsor">UWindsor</option><option value="St. Clair College">St. Clair College</option><option value="other">Other institution</option></select></label>
                <label>Faculty or area of study <span>(required)</span><select name="faculty" required value={details.faculty} onChange={event => setField('faculty', event.target.value)}><option value="">Choose your area</option>{FACULTIES.map(value => <option key={value}>{value}</option>)}</select></label>
                {institutionChoice === 'other' && <label className="attendance-field-wide">Institution name <span>(required)</span><input name="institution" required maxLength={160} value={details.institution} onChange={event => setField('institution', event.target.value)} /></label>}
              </>}
              {details.category && !student && <>
                <label>Organisation <span>({details.category === 'sponsor' ? 'required' : 'optional'})</span><input name="organisation" autoComplete="organization" required={details.category === 'sponsor'} maxLength={160} value={details.organisation} onChange={event => setField('organisation', event.target.value)} /></label>
                <label>Role / title <span>(optional)</span><input name="role" autoComplete="organization-title" maxLength={160} value={details.role} onChange={event => setField('role', event.target.value)} /></label>
              </>}
              <label className="attendance-field-wide">Are you attending with a team or organisation?<select name="withTeam" value={details.withTeam ? 'yes' : 'no'} onChange={event => setField('withTeam', event.target.value === 'yes')}><option value="no">No, I’m attending individually</option><option value="yes">Yes, I’m attending with a team or organisation</option></select></label>
              {details.withTeam && <label className="attendance-field-wide">Team or organisation name <span>(optional)</span><input name="teamName" maxLength={160} value={details.teamName} onChange={event => setField('teamName', event.target.value)} /><span className="attendance-help">You’re registering yourself. Each team member or representative needs their own registration and event choices.</span></label>}
              <div className="attendance-field-wide attendance-dietary-field"><label htmlFor="attendance-dietary">Dietary requirements <span>(optional)</span></label><input id="attendance-dietary" name="dietary" maxLength={500} value={details.dietary} onChange={event => setField('dietary', event.target.value)} placeholder="Tell us what we need to prepare" /><label className="attendance-check"><input type="checkbox" checked={details.dietary === 'None'} onChange={event => setField('dietary', event.target.checked ? 'None' : '')} /><span>No dietary requirements</span></label></div>
              <label className="attendance-field-wide">Accessibility or accommodation requests <span>(optional)</span><textarea name="accessibility" rows={3} maxLength={1000} value={details.accessibility} onChange={event => setField('accessibility', event.target.value)} /><span className="attendance-help">Share only what we need to support your attendance. You can update this later or contact <a href={`mailto:${SITE.contactEmail}`}>the organising team</a>.</span></label>
              <label className="attendance-field-wide">How did you hear about us? <span>(optional)</span><select name="referral" value={details.referral} onChange={event => setField('referral', event.target.value)}><option value="">Choose an option</option>{REFERRALS.map(value => <option key={value}>{value}</option>)}</select></label>
            </div>
          </fieldset>
          <fieldset className="attendance-step" disabled={busy}>
            <legend><span className="attendance-step-number" aria-hidden="true">02</span>Choose your events</legend>
            <p className="attendance-step-lede">Choose as many as you like. Select a full event to join its waitlist.</p>
            {loading && <p className="attendance-notice" role="status">Checking current registration availability…</p>}
            {availabilityError && <div className="attendance-notice attendance-notice--warning" role="status"><p>{availabilityError}</p><button type="button" className="attendance-text-button" onClick={refresh}>Check availability again</button></div>}
            <EventSelection events={events} selected={selectedIds} onChange={setSelected} disabled={busy || !live} />
            <p className="attendance-live-summary" aria-live="polite">You’re registering for <strong>{selectedIds.length} event{selectedIds.length === 1 ? '' : 's'}</strong>.{waitlisted > 0 && ` ${waitlisted} selection${waitlisted === 1 ? ' is' : 's are'} for a waitlist.`}</p>
          </fieldset>
          <fieldset className="attendance-step attendance-review" disabled={busy}>
            <legend><span className="attendance-step-number" aria-hidden="true">03</span>Review and register</legend>
            {selectedEvents.length ? <ul className="attendance-review-list">{selectedEvents.map(event => <li key={event.id}><div><strong>{event.title}</strong><span>{eventDate(event, true)} · {eventTime(event)}</span></div><span className={`attendance-status attendance-status--${eventStatus(event)}`}>{eventStatus(event) === 'full' ? 'Join waitlist' : 'Register'}</span></li>)}</ul> : <p>Choose at least one event above to register.</p>}
            <p className="attendance-help">Places are assigned when you submit. If an event fills before then, your confirmation will clearly show a waitlist place.</p>
            <label className="attendance-check"><input name="consent" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I understand that Hult Prize at UWindsor will use my details to manage my event registrations and send essential event updates. <strong>(required)</strong></span></label>
            <label className="attendance-check"><input name="marketingConsent" type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} /><span>Keep me updated about other Hult Prize at UWindsor events and opportunities. <span>(optional)</span></span></label>
            <p className="attendance-help">Read our <Link to="/privacy">event registration privacy notice</Link>. Your contact details are not automatically shared with sponsors or partners.</p>
            <div className="attendance-honeypot" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
            {error && <div className="attendance-notice attendance-notice--error" ref={errorRef} role="alert" tabIndex={-1}>{error}</div>}
            <button className="btn btn--primary attendance-submit" type="submit" disabled={busy || !live || loading} aria-busy={busy}>{busy ? 'Saving your registration…' : 'Register for selected events'}<span aria-hidden="true">→</span></button>
            {!live && !loading && <p className="attendance-help">Registration is currently unavailable. Contact <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> for help.</p>}
          </fieldset>
        </form>
      </>}
    </Section>
  </PageLayout>
}
