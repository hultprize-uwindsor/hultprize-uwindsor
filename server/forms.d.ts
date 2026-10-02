import type { IncomingMessage, ServerResponse } from 'node:http'

export function validateSubmission(body: unknown): Record<string, string> | null
export function handleForms(
  request: IncomingMessage & { body?: unknown },
  response: ServerResponse,
  options?: { env?: Record<string, string | undefined>; fetch?: typeof fetch; now?: number },
): Promise<void>
