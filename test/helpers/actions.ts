// Shared fixtures for the action-handler tests (src/actions/*.test.ts, covering
// src/actions/index.ts). The vendor and BotID mocks live here so each test file
// only has to register them:
//   vi.mock('@/lib/vendor/brevo', () => brevoMock)
//   vi.mock('botid/server', () => botidMock)
import { vi } from 'vitest'

import type { ContactRequest } from '@/lib/contact'
import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'
import type { BrevoResult, SendEmailParams, UpsertContactParams } from '@/lib/vendor/brevo'

export const brevoMock = {
  sendTransactionalEmail: vi.fn<(params: SendEmailParams) => Promise<BrevoResult>>(),
  upsertContact: vi.fn<(params: UpsertContactParams) => Promise<BrevoResult>>(),
}

export const botidMock = { checkBotId: vi.fn<() => Promise<{ isBot: boolean }>>() }

// Not exported: it's only ever the default below — a test asks for a failure,
// never for the success it already gets.
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

// Env vars are read at module import (test/stubs/astro-env-server.ts), so every
// case re-imports through a fresh module graph. That also hands each test a
// clean rate-limit window — the sliding window is module-level state in
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

// Dispatches on the tag rather than call order: the three calls fire inside one
// Promise.all, and a test that pinned their order would break on a harmless
// reshuffle.
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

// `astro:actions` is re-instantiated by every vi.resetModules(), so the class the
// handler throws is never the one a test file would have imported: assert on the
// shape Astro serializes (type + code), not on instanceof.
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
