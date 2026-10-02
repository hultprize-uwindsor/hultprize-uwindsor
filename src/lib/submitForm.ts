export type FormPayload = Record<string, string>

export const FORM_ERROR_MESSAGES: Record<string, string> = {
  unavailable: 'The form is unavailable right now. Please email us directly.',
  rate_limited: 'Please wait a few minutes before trying again, or email us directly.',
  invalid_request: 'Please check your details and try again.',
  conflict: 'Your details changed during submission. Please refresh and try again.',
  unconfirmed: 'We could not confirm your response. Try again with the same details, or email us directly.',
}

export async function submitForm(payload: FormPayload, requestId: string) {
  try {
    const response = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId }),
      signal: AbortSignal.timeout(18_000),
    })
    const receipt = await response.json()
    if (!response.ok || receipt.ok !== true || receipt.saved !== true || receipt.requestId !== requestId) {
      return { ok: false, message: FORM_ERROR_MESSAGES[receipt.code] ?? FORM_ERROR_MESSAGES.unconfirmed }
    }
    return { ok: true, message: '' }
  } catch {
    return { ok: false, message: FORM_ERROR_MESSAGES.unconfirmed }
  }
}

/** Keep the same ID when retrying the same content after a lost response. */
export function submissionKey(payload: FormPayload, previous: { content: string; id: string } | null) {
  const content = JSON.stringify(payload)
  return previous?.content === content ? previous : { content, id: crypto.randomUUID() }
}
