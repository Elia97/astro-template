// vi.mock is hoisted per file and cannot be registered from here: each test file
// calls vi.mock('@/lib/vendor/brevo', …) and vi.mock('botid/server', …) itself.
import { vi } from 'vitest'

import type { ContactRequest } from '@/lib/contact'
import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'
import type { BrevoResult, SendEmailParams, UpsertContactParams } from '@/lib/vendor/brevo'

export const brevoMock = {
  sendTransactionalEmail: vi.fn<(params: SendEmailParams) => Promise<BrevoResult>>(),
  upsertContact: vi.fn<(params: UpsertContactParams) => Promise<BrevoResult>>(),
}

export const botidMock = { checkBotId: vi.fn<() => Promise<{ isBot: boolean }>>() }

const OK: BrevoResult = { ok: true }
export const KO_ERROR = 'brevo said no'
export const KO: BrevoResult = { ok: false, error: KO_ERROR }

export const CONTACT_INPUT: ContactRequest = {
  [HONEYPOT_FIELD]: '',
  firstName: 'Mario',
  lastName: 'Rossi',
  email: 'mario@example.test',
  message: 'Vorrei un preventivo.',
  consent: true,
}

export const CLIENT = { clientAddress: '203.0.113.10' }

export interface Env {
  prod?: boolean
  botidEnforce?: boolean
}

// A fresh module graph also resets the sliding window: module-level state in
// src/lib/forms/rate-limit.ts.
export async function importActions(env: Env = {}) {
  vi.stubEnv('PROD', env.prod ?? false)
  vi.stubEnv('BOTID_ENFORCE', env.botidEnforce ? 'true' : 'false')
  vi.resetModules()
  return import('@/actions')
}

interface BrevoAnswers {
  notify?: BrevoResult
  autoreply?: BrevoResult
  upsert?: BrevoResult
}

// src/actions/index.ts fires the three sends inside one Promise.all, so the answers
// dispatch on the tag rather than on call order.
export function brevoAnswers({ notify = OK, autoreply = OK, upsert = OK }: BrevoAnswers = {}) {
  brevoMock.sendTransactionalEmail.mockImplementation((params) =>
    Promise.resolve(params.tags?.includes('autoreply') ? autoreply : notify),
  )
  brevoMock.upsertContact.mockResolvedValue(upsert)
}

export function resetActionMocks() {
  vi.clearAllMocks()
  brevoAnswers()
  botidMock.checkBotId.mockResolvedValue({ isBot: false })
}

export function restoreActionEnv() {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetModules()
}

export interface ThrownActionError extends Error {
  type: string
  code: string
}

// vi.resetModules() re-instantiates `astro:actions`, so `instanceof ActionError`
// never matches the class the handler threw: match on the serialized shape.
function isActionError(error: unknown): error is ThrownActionError {
  return error instanceof Error && 'type' in error && error.type === 'AstroActionError' && 'code' in error
}

export async function rejectionOf(promise: Promise<unknown>): Promise<ThrownActionError> {
  try {
    await promise
  } catch (error) {
    if (isActionError(error)) return error
    throw error
  }
  throw new Error('expected an ActionError, the action resolved instead')
}

export const spyOnConsoleError = () => vi.spyOn(console, 'error').mockImplementation(() => {})
export const spyOnConsoleWarn = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
