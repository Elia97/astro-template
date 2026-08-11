// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createActionFormBinding } from './action-submit'
import { fieldErrorId } from './field-errors'

// The shape `astro:actions` really produces (mirrored by test/stubs/astro-actions.ts).
function inputError(fields: Record<string, string[]>): unknown {
  return { type: 'AstroActionInputError', issues: [], fields }
}

function buildForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form data-contact-form
          data-i18n-submit="Invia"
          data-i18n-sending="Invio…"
          data-i18n-generic-error="Errore generico">
      <input name="email" aria-describedby="${fieldErrorId('email')}" />
      <p id="${fieldErrorId('email')}" data-field-error="email"></p>
      <textarea name="message" aria-describedby="${fieldErrorId('message')}"></textarea>
      <p id="${fieldErrorId('message')}" data-field-error="message"></p>
      <p data-form-success class="hidden"></p>
      <p data-form-error class="hidden"></p>
      <button type="submit">Invia</button>
    </form>`
  const form = document.querySelector('form')
  if (!form) throw new Error('fixture form missing')
  return form
}

type SubmitSpy = (payload: unknown) => Promise<{ error?: unknown }>

async function submitWith(result: { error?: unknown }, spy?: SubmitSpy): Promise<HTMLFormElement> {
  const form = buildForm()
  const submit = spy ?? vi.fn(() => Promise.resolve(result))
  createActionFormBinding({
    formSelector: '[data-contact-form]',
    buildPayload: (f) => ({ email: f.querySelector<HTMLInputElement>('[name="email"]')?.value ?? '' }),
    submit,
  })()
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await vi.waitFor(() => {
    expect(submit).toHaveBeenCalled()
  })
  await Promise.resolve()
  return form
}

const successBox = (f: HTMLFormElement) => f.querySelector('[data-form-success]') as HTMLElement
const errorBox = (f: HTMLFormElement) => f.querySelector('[data-form-error]') as HTMLElement
const slot = (f: HTMLFormElement, field: string) => f.querySelector(`[data-field-error="${field}"]`) as HTMLElement
const submitButton = (f: HTMLFormElement) => f.querySelector('button[type="submit"]') as HTMLButtonElement

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('successful submit', () => {
  it('resets the form, clears field errors and shows the success box', async () => {
    const form = await submitWith({})
    form.querySelector<HTMLInputElement>('[name="email"]')?.setAttribute('value', 'a@b.test')

    expect(successBox(form).classList.contains('hidden')).toBe(false)
    expect(errorBox(form).classList.contains('hidden')).toBe(true)
    expect(slot(form, 'email').textContent).toBe('')
  })

  it('re-enables the submit button and restores its label', async () => {
    const form = await submitWith({})

    expect(submitButton(form).disabled).toBe(false)
    expect(submitButton(form).textContent).toBe('Invia')
  })
})

describe('validation errors land on their field', () => {
  it('fills the field slot and marks the control invalid', async () => {
    const form = await submitWith({ error: inputError({ email: ['Email non valida'] }) })

    expect(slot(form, 'email').textContent).toBe('Email non valida')
    expect(form.querySelector('[name="email"]')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('stays silent at form level when every message found a slot', async () => {
    const form = await submitWith({ error: inputError({ email: ['Email non valida'] }) })

    expect(errorBox(form).classList.contains('hidden')).toBe(true)
  })

  it('speaks at form level for a message with no slot to land in', async () => {
    const form = await submitWith({ error: inputError({ captcha: ['Verifica fallita'] }) })

    expect(errorBox(form).classList.contains('hidden')).toBe(false)
    expect(errorBox(form).textContent).toBe('Verifica fallita')
  })

  it('moves focus to the first invalid control', async () => {
    const form = await submitWith({ error: inputError({ message: ['Troppo corto'] }) })

    expect(document.activeElement).toBe(form.querySelector('[name="message"]'))
  })
})

describe('non-validation errors', () => {
  it("shows the action's own message when it carries one", async () => {
    const form = await submitWith({ error: { message: 'Troppe richieste' } })

    expect(errorBox(form).textContent).toBe('Troppe richieste')
  })

  it('falls back to the generic message when the error carries none', async () => {
    const form = await submitWith({ error: 'boom' })

    expect(errorBox(form).textContent).toBe('Errore generico')
  })
})

describe('binding lifecycle', () => {
  it('submits once per event even if setup runs twice', async () => {
    const form = buildForm()
    const submit = vi.fn((): Promise<{ error?: unknown }> => Promise.resolve({}))
    const bind = createActionFormBinding({ formSelector: '[data-contact-form]', buildPayload: () => ({}), submit })
    bind()
    bind()

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => {
      expect(submit).toHaveBeenCalled()
    })

    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('unbinds on astro:before-swap', async () => {
    const form = buildForm()
    const submit = vi.fn((): Promise<{ error?: unknown }> => Promise.resolve({}))
    createActionFormBinding({ formSelector: '[data-contact-form]', buildPayload: () => ({}), submit })()

    document.dispatchEvent(new Event('astro:before-swap'))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await Promise.resolve()

    expect(submit).not.toHaveBeenCalled()
  })

  it('prevents the browser from navigating away', async () => {
    const form = buildForm()
    createActionFormBinding({
      formSelector: '[data-contact-form]',
      buildPayload: () => ({}),
      submit: vi.fn((): Promise<{ error?: unknown }> => Promise.resolve({})),
    })()

    const event = new Event('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
