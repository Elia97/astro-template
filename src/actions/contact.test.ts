import {
  brevoAnswers,
  brevoMock,
  CLIENT,
  CONTACT_INPUT,
  importActions,
  KO,
  KO_ERROR,
  rejectionOf,
  resetActionMocks,
  restoreActionEnv,
  spyOnConsoleError,
} from '@test/helpers/actions'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The error policy of src/actions/index.ts: exactly one of the three Brevo calls
// is fatal. The owner notification IS the lead — losing it silently is the worst
// outcome the form has — while the autoreply and the CRM upsert are courtesies
// that must never turn a delivered lead into an error the user sees.
vi.mock('@/lib/vendor/brevo', () => brevoMock)
vi.mock('botid/server', () => ({ checkBotId: vi.fn() }))

beforeEach(resetActionMocks)
afterEach(restoreActionEnv)

describe('contact handler', () => {
  it('notifies the owner, answers the sender and upserts the contact', async () => {
    const { handleContact } = await importActions()

    await expect(handleContact(CONTACT_INPUT, CLIENT)).resolves.toEqual({ ok: true })

    expect(brevoMock.sendTransactionalEmail).toHaveBeenCalledTimes(2)
    expect(brevoMock.upsertContact).toHaveBeenCalledTimes(1)
  })

  it('replies to the sender, so answering the notification reaches them', async () => {
    const { handleContact } = await importActions()

    await handleContact(CONTACT_INPUT, CLIENT)

    const notification = brevoMock.sendTransactionalEmail.mock.calls.find((call) => call[0].tags?.includes('contact'))
    expect(notification?.[0].replyTo).toEqual({ email: CONTACT_INPUT.email, name: 'Mario Rossi' })
  })

  it('fails loud when the owner notification fails — the lead would be lost', async () => {
    const consoleError = spyOnConsoleError()
    brevoAnswers({ notify: KO })
    const { handleContact } = await importActions()

    const error = await rejectionOf(handleContact(CONTACT_INPUT, CLIENT))

    expect(error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(consoleError).toHaveBeenCalledWith('[contact] notification failed:', KO_ERROR)
  })

  // Best-effort by design: the lead is already in the owner's inbox, so a failure
  // here is logged and swallowed rather than shown to someone whose message did
  // in fact arrive.
  it('swallows an autoreply failure', async () => {
    const consoleError = spyOnConsoleError()
    brevoAnswers({ autoreply: KO })
    const { handleContact } = await importActions()

    await expect(handleContact(CONTACT_INPUT, CLIENT)).resolves.toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalledWith('[contact] autoreply failed:', KO_ERROR)
  })

  it('swallows a CRM upsert failure', async () => {
    const consoleError = spyOnConsoleError()
    brevoAnswers({ upsert: KO })
    const { handleContact } = await importActions()

    await expect(handleContact(CONTACT_INPUT, CLIENT)).resolves.toEqual({ ok: true })
    expect(consoleError).toHaveBeenCalledWith('[contact] contact upsert failed:', KO_ERROR)
  })
})

// Brevo is the only sink the submission ever reaches, so this line is the whole
// recovery path: without it the visitor gets "riprova" and the lead is gone with
// no record anywhere.
describe('lead recovery', () => {
  it('writes the submission to the log when the notification fails', async () => {
    const consoleError = spyOnConsoleError()
    brevoAnswers({ notify: KO })
    const { handleContact } = await importActions()

    await rejectionOf(handleContact(CONTACT_INPUT, CLIENT))

    const recovery = consoleError.mock.calls.find((call) => call[0] === '[contact] lead-recovery')
    expect(recovery).toBeDefined()
    expect(JSON.parse(String(recovery?.[1]))).toMatchObject({
      email: CONTACT_INPUT.email,
      message: CONTACT_INPUT.message,
    })
  })
})
