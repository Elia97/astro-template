// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { HONEYPOT_FIELD } from '@/lib/honeypot'

import { applyFieldErrors, clearFieldErrors, fieldErrorId, focusFirstInvalid } from './field-errors'

function buildForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form>
      <input name="email" aria-describedby="${fieldErrorId('email')}" />
      <p id="${fieldErrorId('email')}" data-field-error="email"></p>
      <textarea name="message" aria-describedby="${fieldErrorId('message')}"></textarea>
      <p id="${fieldErrorId('message')}" data-field-error="message"></p>
      <input name="${HONEYPOT_FIELD}" />
    </form>`
  const form = document.querySelector('form')
  if (!form) throw new Error('fixture form missing')
  return form
}

let form: HTMLFormElement

beforeEach(() => {
  form = buildForm()
})

const slot = (field: string) => form.querySelector(`[data-field-error="${field}"]`)
const control = (name: string) => form.querySelector(`[name="${name}"]`)

describe('applyFieldErrors', () => {
  it('writes each message into its own slot and marks the control invalid', () => {
    const result = applyFieldErrors(form, { email: ['Email non valida'] })
    expect(result.matched).toBe(true)
    expect(slot('email')?.textContent).toBe('Email non valida')
    expect(control('email')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('leaves untouched fields alone', () => {
    applyFieldErrors(form, { email: ['Email non valida'] })
    expect(slot('message')?.textContent).toBe('')
    expect(control('message')?.hasAttribute('aria-invalid')).toBe(false)
  })

  // Reporting it would tell a bot which field gave it away — the whole point of
  // the decoy is that a filled submission looks like it succeeded.
  it('never surfaces a honeypot error, in a slot or form-level', () => {
    const result = applyFieldErrors(form, { [HONEYPOT_FIELD]: ['Campo non valido'] })
    expect(result).toEqual({ matched: false, unmatched: [] })
    expect(control(HONEYPOT_FIELD)?.hasAttribute('aria-invalid')).toBe(false)
  })

  it('hands back messages that have no slot, for the form-level alert', () => {
    const result = applyFieldErrors(form, { nickname: ['Campo sconosciuto'] })
    expect(result).toEqual({ matched: false, unmatched: ['Campo sconosciuto'] })
  })

  it('reports only the first message of a field', () => {
    applyFieldErrors(form, { email: ['Prima', 'Seconda'] })
    expect(slot('email')?.textContent).toBe('Prima')
  })
})

describe('clearFieldErrors', () => {
  it('empties every slot and drops every aria-invalid', () => {
    applyFieldErrors(form, { email: ['Email non valida'], message: ['Troppo lungo'] })
    clearFieldErrors(form)
    expect(slot('email')?.textContent).toBe('')
    expect(form.querySelectorAll('[aria-invalid]')).toHaveLength(0)
  })
})

describe('focusFirstInvalid', () => {
  // DOM order, not the key order of error.fields, which would send focus
  // backwards past a field the reader hasn't reached.
  it('focuses the first invalid control in DOM order', () => {
    applyFieldErrors(form, { message: ['Troppo lungo'], email: ['Email non valida'] })
    expect(focusFirstInvalid(form)).toBe(true)
    expect(document.activeElement).toBe(control('email'))
  })

  it('reports that there was nothing to focus', () => {
    expect(focusFirstInvalid(form)).toBe(false)
  })
})
