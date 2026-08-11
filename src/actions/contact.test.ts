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

describe('reply-to without a name', () => {
  // An empty display name on a reply-to header renders as `<>` in some mail clients.
  it('sends a bare address when the submission carries no name', async () => {
    brevoAnswers({})
    const { handleContact } = await importActions()

    await handleContact({ ...CONTACT_INPUT, firstName: '', lastName: '' }, CLIENT)

    const notification = brevoMock.sendTransactionalEmail.mock.calls.find((call) => call[0].tags?.includes('contact'))
    expect(notification?.[0].replyTo).toEqual({ email: CONTACT_INPUT.email })
  })
})
