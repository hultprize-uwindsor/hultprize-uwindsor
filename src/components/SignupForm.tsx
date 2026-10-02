import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { SITE } from '../data/site'
import { submissionKey, submitForm } from '../lib/submitForm'
import './SignupForm.css'

type TeamStatus = 'yes' | 'no' | 'looking' | ''

interface FormState {
  name: string
  email: string
  program: string
  year: string
  phone: string
  teamStatus: TeamStatus
}

const YEAR_OPTIONS = [
  '1st year',
  '2nd year',
  '3rd year',
  '4th year+',
  "Master's",
  'PhD',
  'Other',
]

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  program: '',
  year: '',
  phone: '',
  teamStatus: '',
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function SignupForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [website, setWebsite] = useState('')
  const request = useRef<{ content: string; id: string } | null>(null)
  const inFlight = useRef(false)
  const formId = useId()
  const successHeading = useRef<HTMLHeadingElement>(null)
  // The focused submit button disappears on success, so focus lands on the confirmation instead of the page.
  useEffect(() => { if (status === 'success') successHeading.current?.focus() }, [status])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!form.email.trim()) {
      next.email = 'Please enter your email.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Please enter a valid email.'
    }
    if (!form.program.trim()) next.program = 'Please enter your program.'
    if (!form.year) next.year = 'Please select your year.'
    if (!form.teamStatus) next.teamStatus = 'Please choose one option.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (inFlight.current) return
    const formElement = e.currentTarget as HTMLFormElement
    if (!validate()) {
      // Focus the first field to fix, so the submit button does not jump away under a pointer left with nothing to do.
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"], fieldset:has(.signup-error) input')?.focus())
      return
    }

    inFlight.current = true
    setStatus('submitting')
    setErrorMessage('')

    const payload = {
      action: 'signup',
      name: form.name.trim(),
      email: form.email.trim(),
      program: form.program.trim(),
      year: form.year,
      phone: form.phone.trim(),
      teamStatus: form.teamStatus,
      website,
    }
    request.current = submissionKey(payload, request.current)
    const result = await submitForm(payload, request.current.id)
    inFlight.current = false
    if (result.ok) {
      setStatus('success')
      setForm(INITIAL_STATE)
      request.current = null
    } else {
      setErrorMessage(result.message)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="signup-success" role="status">
        <span className="signup-success__mark" aria-hidden="true">✓</span>
        <h3 ref={successHeading} tabIndex={-1}>You're on the list.</h3>
        <p>
          Thanks for signing up. We'll be in touch by email with next steps.
        </p>
        <p className="signup-disclaimer">
          This form collects interest for our UWindsor team. Official Hult
          Prize competition registration happens separately at{' '}
          <a href={SITE.registrationUrl} target="_blank" rel="noreferrer">
            hultprize.org/register
          </a>
          .
        </p>
        <p className="signup-disclaimer"><a href={SITE.signalRegisteredUrl} target="_blank" rel="noopener noreferrer">Join the registered teams chat ↗</a></p>
        <button type="button" className="btn btn--dark" onClick={() => setStatus('idle')}>
          Submit another response
        </button>
      </div>
    )
  }

  return (
    <form className="signup-form" onSubmit={handleSubmit} noValidate aria-busy={status === 'submitting'}>
      <div className="form-trap" aria-hidden="true">
        <label>Leave this blank<input name="website" autoComplete="off" tabIndex={-1} value={website} onChange={e => setWebsite(e.target.value)} /></label>
      </div>
      <div className="signup-form__grid">
        <label className="signup-field">
          <span>Full name *</span>
          <input
            type="text"
            name="name"
            maxLength={120}
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          />
          {errors.name && <em className="signup-error" id={`${formId}-name-error`}>{errors.name}</em>}
        </label>

        <label className="signup-field">
          <span>Email *</span>
          <input
            type="email"
            name="email"
            maxLength={254}
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? `${formId}-email-error` : undefined}
          />
          {errors.email && <em className="signup-error" id={`${formId}-email-error`}>{errors.email}</em>}
        </label>

        <label className="signup-field">
          <span>Program *</span>
          <input
            type="text"
            name="program"
            maxLength={160}
            required
            value={form.program}
            onChange={(e) => update('program', e.target.value)}
            placeholder="e.g. Mechanical Engineering"
            aria-invalid={!!errors.program}
            aria-describedby={errors.program ? `${formId}-program-error` : undefined}
          />
          {errors.program && <em className="signup-error" id={`${formId}-program-error`}>{errors.program}</em>}
        </label>

        <label className="signup-field">
          <span>Year *</span>
          <select
            name="year"
            required
            value={form.year}
            onChange={(e) => update('year', e.target.value)}
            aria-invalid={!!errors.year}
            aria-describedby={errors.year ? `${formId}-year-error` : undefined}
          >
            <option value="" disabled>
              Select your year
            </option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {errors.year && <em className="signup-error" id={`${formId}-year-error`}>{errors.year}</em>}
        </label>

        <label className="signup-field">
          <span>Phone number <small>Optional</small></span>
          <input
            type="tel"
            name="phone"
            maxLength={40}
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            autoComplete="tel"
            placeholder="(xxx) xxx-xxxx"
          />
        </label>

        <fieldset className="signup-field signup-field--radio" aria-describedby={errors.teamStatus ? `${formId}-team-error` : undefined}>
          <legend>Do you have a team? *</legend>
          <div className="signup-radio-group">
            {(
              [
                ['yes', 'Yes'],
                ['no', 'No'],
                ['looking', "Looking for one"],
              ] as [TeamStatus, string][]
            ).map(([value, label]) => (
              <label key={value} className="signup-radio">
                <input
                  type="radio"
                  name={`${formId}-teamStatus`}
                  value={value}
                  checked={form.teamStatus === value}
                  aria-invalid={!!errors.teamStatus}
                  onChange={() => update('teamStatus', value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {errors.teamStatus && <em className="signup-error" id={`${formId}-team-error`}>{errors.teamStatus}</em>}
        </fieldset>
      </div>

      <button
        type="submit"
        className="btn btn--dark btn--block"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Saving your details…' : 'Keep me in the loop'}
      </button>

      <p className="signup-disclaimer">
        This form collects interest for our UWindsor team. Official Hult
        Prize competition registration happens separately at{' '}
        <a href={SITE.registrationUrl} target="_blank" rel="noreferrer">
          hultprize.org/register
        </a>
        .
      </p>

      {status === 'error' && (
        <p className="signup-error signup-error--form" role="alert">
          {errorMessage}{' '}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      )}
    </form>
  )
}
