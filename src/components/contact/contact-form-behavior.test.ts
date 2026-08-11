// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HONEYPOT_FIELD } from '@/lib/forms/honeypot'

// buildPayload maps by control NAME: a renamed control silently sends an empty string.
function renderForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form data-contact-form>
      <input name="firstName" value="Ada" />
      <input name="lastName" value="Lovelace" />
      <input name="email" value="ada@example.test" />
      <textarea name="message">Ciao</textarea>
      <input type="checkbox" name="consent" checked />
      <input name="${HONEYPOT_FIELD}" value="" />
      <button type="submit">Invia</button>
    </form>`
  return document.querySelector('form') as HTMLFormElement
}

// Both imports must follow vi.resetModules(): a spy on an earlier `astro:actions`
// sits on a different object than the module under test binds to.
async function bindWithSpy() {
  const { actions } = await import('astro:actions')
  const spy = vi.spyOn(actions, 'contact').mockResolvedValue({} as never)
  const { bindContactForm } = await import('@/components/contact/contact-form-behavior')
  bindContactForm()
  return spy
}

async function submitAndCapture(): Promise<Record<string, unknown>> {
  const form = renderForm()
  const spy = await bindWithSpy()

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => {
    expect(spy).toHaveBeenCalled()
  })
  return spy.mock.calls[0]?.[0] as Record<string, unknown>
}

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('contact form payload', () => {
  it('maps every named control onto the action payload', async () => {
    const payload = await submitAndCapture()

    expect(payload).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
      message: 'Ciao',
    })
  })

  it('carries the decoy through so the handler can drop it silently', async () => {
    const payload = await submitAndCapture()

    expect(payload).toHaveProperty(HONEYPOT_FIELD, '')
  })

  it('coerces the consent checkbox to true', async () => {
    const payload = await submitAndCapture()

    expect(payload.consent).toBe(true)
  })

  it('sends an empty string for a control the form does not carry', async () => {
    document.body.innerHTML = '<form data-contact-form><button type="submit">Invia</button></form>'
    const form = document.querySelector('form') as HTMLFormElement
    const spy = await bindWithSpy()

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    expect(spy.mock.calls[0]?.[0]).toMatchObject({ email: '', consent: false })
  })
})
