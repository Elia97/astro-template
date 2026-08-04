// @vitest-environment happy-dom
import { activate, listbox, native, renderSelect, trigger } from '@test/helpers/select-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// The defect this pins: the label and the error both address the native by id,
// and hiding it left the visible control anonymous — announced as "button", with
// the validation error attached to something no one can reach.
describe('select activation hands the field wiring to the visible control', () => {
  it('moves the id, so the label names and activates the trigger', async () => {
    renderSelect()
    await activate()

    expect(trigger().id).toBe('topic')
    expect(native().hasAttribute('id')).toBe(false)
    expect(document.querySelector('label')?.htmlFor).toBe('topic')
  })

  it('moves aria-describedby, so the error is announced on the trigger', async () => {
    renderSelect()
    await activate()

    expect(trigger().getAttribute('aria-describedby')).toBe('topic-error')
    expect(native().hasAttribute('aria-describedby')).toBe(false)
  })

  it('points the trigger at the listbox it controls', async () => {
    renderSelect()
    await activate()

    expect(listbox().id).toBe('topic-listbox')
    expect(trigger().getAttribute('aria-controls')).toBe('topic-listbox')
  })

  it('carries required and disabled across', async () => {
    renderSelect({ required: true })
    await activate()

    expect(trigger().getAttribute('aria-required')).toBe('true')
    expect(trigger().disabled).toBe(false)
  })

  it('keeps name on the native, which is what still submits', async () => {
    renderSelect()
    await activate()

    expect(native().name).toBe('topic')
  })
})

describe('select initial state', () => {
  it('marks the pre-selected option instead of leaving every option unselected', async () => {
    renderSelect({ value: 'preventivo' })
    await activate()

    const selected = listbox().querySelectorAll('[aria-selected="true"]')
    expect(selected).toHaveLength(1)
    expect((selected[0] as HTMLElement).dataset.value).toBe('preventivo')
  })

  it('marks nothing while the placeholder is current', async () => {
    renderSelect()
    await activate()

    expect(listbox().querySelectorAll('[aria-selected="true"]')).toHaveLength(0)
  })
})

describe('select stays the form-facing source of truth', () => {
  it('writes the chosen value back into the native and re-dispatches change', async () => {
    renderSelect()
    await activate()
    const changes = vi.fn()
    native().addEventListener('change', changes)

    trigger().click()
    listbox().querySelector<HTMLElement>('[data-value="consulenza"]')?.click()

    expect(native().value).toBe('consulenza')
    expect(changes).toHaveBeenCalledTimes(1)
    expect(trigger().getAttribute('aria-expanded')).toBe('false')
  })
})
