import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { SITE } from '../data/site'
import { submissionKey, submitForm } from '../lib/submitForm'
import './ContactEnquiry.css'

const TOPICS = [
  ['general', 'A general question'],
  ['competing', 'Joining the competition'],
  ['partnership', 'Partnering with us'],
  ['mentoring', 'Mentoring or volunteering'],
  ['media', 'Media and communications'],
] as const

export default function ContactEnquiry({ initialTopic = 'general' }: { initialTopic?: string }) {
  const id = useId()
  const [form, setForm] = useState({ name: '', email: '', topic: TOPICS.some(([value]) => value === initialTopic) ? initialTopic : 'general', message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const request = useRef<{ content: string; id: string } | null>(null)
  const inFlight = useRef(false)
  const confirmation = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (status === 'success') confirmation.current?.focus() }, [status])

  function update(key: keyof typeof form, value: string) {
    setForm(previous => ({ ...previous, [key]: value }))
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const formElement = event.currentTarget
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Please enter a valid email address.'
    if (form.message.trim().length < 10) next.message = 'Please tell us a little more (at least 10 characters).'
    setErrors(next)
    if (Object.keys(next).length) {
      requestAnimationFrame(() => formElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const payload = { action: 'enquiry', ...form, name: form.name.trim(), email: form.email.trim(), message: form.message.trim() }
    request.current = submissionKey(payload, request.current)
    inFlight.current = true
    setStatus('submitting')
    setErrorMessage('')
    const result = await submitForm(payload, request.current.id)
    inFlight.current = false
    if (result.ok) {
      setStatus('success')
      request.current = null
    } else {
      setStatus('error')
      setErrorMessage(result.message)
    }
  }

  if (status === 'success') return (
    <div className="enquiry-success" role="status">
      <span className="enquiry-success__mark" aria-hidden="true">✓</span>
      <h3 ref={confirmation} tabIndex={-1}>Message received.</h3>
      <p>Thanks for getting in touch. The team will reply to {form.email.trim()}.</p>
      <button type="button" className="enquiry-submit" onClick={() => { setForm(previous => ({ ...previous, message: '', website: '' })); setStatus('idle') }}>Send another message <span aria-hidden="true">↗</span></button>
    </div>
  )

  return (
    <form className="enquiry-form" onSubmit={send} noValidate aria-busy={status === 'submitting'}>
      <p className="enquiry-form__intro">Tell us what you have in mind. We’ll connect you with the right person.</p>
      <div className="enquiry-trap" aria-hidden="true"><label>Leave this blank<input name="website" autoComplete="off" tabIndex={-1} value={form.website} onChange={event => update('website', event.target.value)} /></label></div>
      <div className="enquiry-form__fields">
        <label className="enquiry-field">
          <span>Your name</span>
          <input name="name" value={form.name} onChange={event => update('name', event.target.value)} autoComplete="name" maxLength={120} required aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} placeholder="Full name" />
          {errors.name && <span className="enquiry-error" id={`${id}-name-error`}>{errors.name}</span>}
        </label>
        <label className="enquiry-field">
          <span>Email address</span>
          <input name="email" type="email" value={form.email} onChange={event => update('email', event.target.value)} autoComplete="email" maxLength={254} required aria-invalid={!!errors.email} aria-describedby={errors.email ? `${id}-email-error` : undefined} placeholder="you@example.com" />
          {errors.email && <span className="enquiry-error" id={`${id}-email-error`}>{errors.email}</span>}
        </label>
        <label className="enquiry-field">
          <span>I’m interested in</span>
          <select name="topic" value={form.topic} onChange={event => update('topic', event.target.value)}>{TOPICS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        <label className="enquiry-field">
          <span>Your message</span>
          <textarea name="message" value={form.message} onChange={event => update('message', event.target.value)} maxLength={4000} rows={5} required aria-invalid={!!errors.message} aria-describedby={errors.message ? `${id}-message-error` : undefined} placeholder="How can we help?" />
          {errors.message && <span className="enquiry-error" id={`${id}-message-error`}>{errors.message}</span>}
        </label>
      </div>
      <button type="submit" className="enquiry-submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending your message…' : 'Send message'}<span aria-hidden="true">↗</span></button>
      <p className="enquiry-form__note">We’ll use your details to respond to your enquiry. You can also email <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
      {status === 'error' && <p className="enquiry-error enquiry-error--form" role="alert">{errorMessage}{' '}<a href={`mailto:${SITE.contactEmail}`}>Email the team ↗</a></p>}
    </form>
  )
}
