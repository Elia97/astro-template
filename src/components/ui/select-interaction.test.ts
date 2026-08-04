// @vitest-environment happy-dom
import { activate, isOpen, key, listbox, native, options, renderSelect, trigger } from '@test/helpers/select-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('opening the listbox', () => {
  it.each(['ArrowDown', 'Enter', ' '])('opens on %s from the trigger', async (k) => {
    renderSelect()
    await activate()

    key(trigger(), k)

    expect(isOpen()).toBe(true)
    expect(listbox().classList.contains('hidden')).toBe(false)
  })

  it('toggles shut on a second click', async () => {
    renderSelect()
    await activate()

    trigger().click()
    trigger().click()

    expect(isOpen()).toBe(false)
  })

  // Opening on the current value, not the top of the list: a reader landing on
  // the first option would have to walk back to find where it already is.
  it('focuses the selected option when there is one', async () => {
    renderSelect({ value: 'preventivo' })
    await activate()

    trigger().click()

    expect(document.activeElement).toBe(options()[1])
  })

  it('falls back to the first option with nothing selected', async () => {
    renderSelect()
    await activate()

    trigger().click()

    expect(document.activeElement).toBe(options()[0])
  })
})

describe('roving focus inside the listbox', () => {
  it('walks down and wraps to the top', async () => {
    renderSelect()
    await activate()
    trigger().click()

    key(document.activeElement as Element, 'ArrowDown')
    expect(document.activeElement).toBe(options()[1])

    key(document.activeElement as Element, 'ArrowDown')
    expect(document.activeElement).toBe(options()[0])
  })

  it('walks up and wraps to the bottom', async () => {
    renderSelect()
    await activate()
    trigger().click()

    key(document.activeElement as Element, 'ArrowUp')

    expect(document.activeElement).toBe(options()[1])
  })
})

describe('choosing an option from the keyboard', () => {
  it.each(['Enter', ' '])('commits the focused option on %s', async (k) => {
    renderSelect()
    await activate()
    const changes = vi.fn()
    native().addEventListener('change', changes)
    trigger().click()
    key(document.activeElement as Element, 'ArrowDown')

    key(document.activeElement as Element, k)

    expect(native().value).toBe('preventivo')
    expect(changes).toHaveBeenCalledTimes(1)
    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(trigger())
  })
})

describe('dismissing the listbox', () => {
  it('closes on Escape and hands focus back to the trigger', async () => {
    renderSelect()
    await activate()
    trigger().click()

    key(document.activeElement as Element, 'Escape')

    expect(isOpen()).toBe(false)
    expect(document.activeElement).toBe(trigger())
  })

  // Tab must not trap: the listbox closes and the browser moves on by itself.
  it('closes on Tab without stealing focus back', async () => {
    renderSelect()
    await activate()
    trigger().click()

    key(document.activeElement as Element, 'Tab')

    expect(isOpen()).toBe(false)
  })

  it('closes on a click outside the component', async () => {
    renderSelect()
    await activate()
    trigger().click()

    document.body.click()

    expect(isOpen()).toBe(false)
  })

  it('stays open on a click inside it', async () => {
    renderSelect()
    await activate()
    trigger().click()

    listbox().click()

    expect(isOpen()).toBe(true)
  })

  it('ignores a key it does not handle', async () => {
    renderSelect()
    await activate()
    trigger().click()

    key(document.activeElement as Element, 'x')

    expect(isOpen()).toBe(true)
  })
})
