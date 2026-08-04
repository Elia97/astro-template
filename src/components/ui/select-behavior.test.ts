// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// What SSR emits (ui/select.astro composed of native + trigger + listbox), before
// the behavior module swaps the native out for the styled trigger.
//
// The current value is assigned, never written as a `selected` attribute: parsing
// innerHTML, happy-dom ignores that attribute and reports the first enabled
// option instead, so an attribute-based fixture would silently test the wrong
// starting state.
function renderSelect({ value = '', required = true } = {}): void {
  document.body.innerHTML = `
    <label for="topic">Argomento</label>
    <div class="relative" data-select-root>
      <select class="flex" data-select-native id="topic" name="topic"${required ? ' required' : ''}
              aria-describedby="topic-error">
        <option value="" disabled>Scegli</option>
        <option value="consulenza">Consulenza</option>
        <option value="preventivo">Preventivo</option>
      </select>
      <button type="button" data-select-trigger aria-haspopup="listbox" aria-expanded="false" class="hidden">
        <span data-select-value></span>
      </button>
      <ul role="listbox" data-select-listbox class="hidden">
        <li role="option" data-value="consulenza" aria-selected="false" tabindex="-1">Consulenza</li>
        <li role="option" data-value="preventivo" aria-selected="false" tabindex="-1">Preventivo</li>
      </ul>
    </div>
    <p id="topic-error">Campo obbligatorio</p>`
  const control = document.querySelector<HTMLSelectElement>('[data-select-native]')
  if (control) control.value = value
}

async function activate(): Promise<void> {
  const { bindSelects } = await import('@/components/ui/select-behavior')
  bindSelects()
}

const trigger = (): HTMLButtonElement => document.querySelector('[data-select-trigger]') as HTMLButtonElement
const native = (): HTMLSelectElement => document.querySelector('[data-select-native]') as HTMLSelectElement
const listbox = (): HTMLElement => document.querySelector('[data-select-listbox]') as HTMLElement

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
