import { useState, type FormEvent } from 'react'
import { SITE } from '../data/site'
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
    if (!validate()) return

    setStatus('submitting')

    const payload = new URLSearchParams({
      name: form.name.trim(),
      email: form.email.trim(),
      program: form.program.trim(),
      year: form.year,
      phone: form.phone.trim(),
      teamStatus: form.teamStatus,
      submittedAt: new Date().toISOString(),
      source: 'uwindsor-hultprize-site',
    })

    if (!SITE.formEndpoint) {
      // No endpoint configured yet (local/dev preview), so report an error.
      console.warn('VITE_FORM_ENDPOINT is not set; form submission skipped.')
      setStatus('error')
      return
    }

    try {
      // Google Apps Script web apps don't return CORS headers we can read,
      // so we send a simple (no-preflight) request and treat a non-throwing
      // fetch as success. Genuine offline/network failures still land in catch.
      await fetch(SITE.formEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      })
      setStatus('success')
      setForm(INITIAL_STATE)
    } catch (err) {
      console.error('Sign-up submission failed', err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="signup-success" role="status">
        <h3>You're on the list! 🎉</h3>
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
        <button className="btn btn--dark" onClick={() => setStatus('idle')}>
          Submit another response
        </button>
      </div>
    )
  }

  return (
    <form className="signup-form" onSubmit={handleSubmit} noValidate>
      <div className="signup-form__grid">
        <label className="signup-field">
          <span>Full name *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoComplete="name"
            aria-invalid={!!errors.name}
          />
          {errors.name && <em className="signup-error">{errors.name}</em>}
        </label>

        <label className="signup-field">
          <span>Email *</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && <em className="signup-error">{errors.email}</em>}
        </label>

        <label className="signup-field">
          <span>Program *</span>
          <input
            type="text"
            value={form.program}
            onChange={(e) => update('program', e.target.value)}
            placeholder="e.g. Mechanical Engineering"
            aria-invalid={!!errors.program}
          />
          {errors.program && <em className="signup-error">{errors.program}</em>}
        </label>

        <label className="signup-field">
          <span>Year *</span>
          <select
            value={form.year}
            onChange={(e) => update('year', e.target.value)}
            aria-invalid={!!errors.year}
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
          {errors.year && <em className="signup-error">{errors.year}</em>}
        </label>

        <label className="signup-field">
          <span>Phone number (optional, to join the chat)</span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            autoComplete="tel"
            placeholder="(xxx) xxx-xxxx"
          />
        </label>

        <fieldset className="signup-field signup-field--radio">
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
                  name="teamStatus"
                  value={value}
                  checked={form.teamStatus === value}
                  onChange={() => update('teamStatus', value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {errors.teamStatus && <em className="signup-error">{errors.teamStatus}</em>}
        </fieldset>
      </div>

      <button
        type="submit"
        className="btn btn--dark btn--block"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Submitting…' : 'Sign up'}
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
          Something went wrong sending your response. Please try again, or
          email us directly at{' '}
          <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
        </p>
      )}
    </form>
  )
}
