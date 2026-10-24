import type { IncomingMessage, ServerResponse } from 'node:http'
export function handleAttendance(request: IncomingMessage & { body?: unknown }, response: ServerResponse, options?: { env?: Record<string, string | undefined>; fetch?: typeof fetch; now?: number }): Promise<void>
export function validateAttendee(value: unknown): Record<string, unknown> | null
export function validateEvent(value: unknown): Record<string, unknown> | null
export function createSession(claims: Record<string, unknown>, secret: string): string
export function rosterCsv(data: Record<string, unknown[]>, filters?: Record<string, string>): string
