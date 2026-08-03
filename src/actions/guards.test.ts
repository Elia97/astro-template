import {
  botidMock,
  brevoMock,
  CLIENT,
  CONTACT_INPUT,
  importActions,
  rejectionOf,
  resetActionMocks,
  restoreActionEnv,
  spyOnConsoleError,
  spyOnConsoleWarn,
} from '@test/helpers/actions'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

// The abuse guards in src/actions/index.ts, in the order they run:
// honeypot → rate limit → BotID. The order is the point — each layer is cheaper
// than the next, and the cheapest must never let expensive work happen first.
vi.mock('@/lib/vendor/brevo', () => brevoMock)
vi.mock('botid/server', () => botidMock)

const TRAPPED = { ...CONTACT_INPUT, [HONEYPOT_FIELD]: 'http://spam.test' }

beforeEach(resetActionMocks)
afterEach(restoreActionEnv)

describe('honeypot', () => {
  it('drops a filled decoy with the success shape, before any Brevo call', async () => {
    const consoleWarn = spyOnConsoleWarn()
    const { handleContact } = await importActions()

    const result = await handleContact(TRAPPED, CLIENT)

    expect(result).toEqual({ ok: true })
    expect(brevoMock.sendTransactionalEmail).not.toHaveBeenCalled()
    expect(brevoMock.upsertContact).not.toHaveBeenCalled()
    expect(consoleWarn).toHaveBeenCalledWith('[contact] honeypot filled — submission dropped')
  })

  it('runs before the rate limit, so trapped traffic never burns a human window', async () => {
    spyOnConsoleWarn()
    const { handleContact } = await importActions()
    for (let i = 0; i < 6; i++) await handleContact(TRAPPED, CLIENT)

    await expect(handleContact(CONTACT_INPUT, CLIENT)).resolves.toEqual({ ok: true })
  })
})

describe('rate limit', () => {
  it('rejects the sixth submission from the same address without calling Brevo', async () => {
    const { handleContact } = await importActions()
    for (let i = 0; i < 5; i++) await handleContact(CONTACT_INPUT, CLIENT)
    brevoMock.sendTransactionalEmail.mockClear()

    const error = await rejectionOf(handleContact(CONTACT_INPUT, CLIENT))

    expect(error.code).toBe('TOO_MANY_REQUESTS')
    expect(brevoMock.sendTransactionalEmail).not.toHaveBeenCalled()
  })

  it('keeps a separate window per address', async () => {
    const { handleContact } = await importActions()
    for (let i = 0; i < 5; i++) await handleContact(CONTACT_INPUT, CLIENT)

    await expect(handleContact(CONTACT_INPUT, { clientAddress: '198.51.100.7' })).resolves.toEqual({ ok: true })
  })
})

describe('bot check', () => {
  it('never runs outside production', async () => {
    const { handleContact } = await importActions()

    await handleContact(CONTACT_INPUT, CLIENT)

    expect(botidMock.checkBotId).not.toHaveBeenCalled()
  })

  it('observes a bot verdict by default — the submission goes through', async () => {
    const consoleWarn = spyOnConsoleWarn()
    botidMock.checkBotId.mockResolvedValue({ isBot: true })
    const { handleContact } = await importActions({ prod: true })

    await expect(handleContact(CONTACT_INPUT, CLIENT)).resolves.toEqual({ ok: true })
    expect(brevoMock.sendTransactionalEmail).toHaveBeenCalledTimes(2)
    expect(consoleWarn).toHaveBeenCalledWith(
      '[contact] bot detected — observe mode, submission allowed (BOTID_ENFORCE=false)',
    )
  })

  it('rejects a bot verdict when enforcing, without calling Brevo', async () => {
    spyOnConsoleWarn()
    botidMock.checkBotId.mockResolvedValue({ isBot: true })
    const { handleContact } = await importActions({ prod: true, botidEnforce: true })

    const error = await rejectionOf(handleContact(CONTACT_INPUT, CLIENT))

    expect(error.code).toBe('FORBIDDEN')
    expect(brevoMock.sendTransactionalEmail).not.toHaveBeenCalled()
  })

  it('fails open when the check itself throws — a broken guard never costs a lead', async () => {
    const consoleError = spyOnConsoleError()
    botidMock.checkBotId.mockRejectedValue(new Error('botid down'))
    const { handleContact } = await importActions({ prod: true, botidEnforce: true })

    await expect(handleContact(CONTACT_INPUT, CLIENT)).resolves.toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalledWith('[contact] bot check failed:', expect.any(Error))
  })
})
