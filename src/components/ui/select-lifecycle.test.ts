// @vitest-environment happy-dom
import { activate, isOpen, key, listbox, native, options, renderSelect, trigger } from '@test/helpers/select-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('defensive and lifecycle paths', () => {
  it('ignores an unhandled key on the trigger', async () => {
    renderSelect()
    await activate()

    key(trigger(), 'x')

    expect(isOpen()).toBe(false)
  })

  it('ignores a listbox click that lands on no option', async () => {
    renderSelect()
    await activate()
    trigger().click()

    listbox().dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(isOpen()).toBe(true)
  })

  // Re-running setup must not activate an already-activated root a second time:
  // the native is hidden by then, and re-binding would double every listener.
  it('skips a root it already activated', async () => {
    renderSelect()
    await activate()
    const { bindSelects } = await import('@/components/ui/select-behavior')
    bindSelects()
    const changes = vi.fn()
    native().addEventListener('change', changes)

    trigger().click()
    options()[0]?.click()

    expect(changes).toHaveBeenCalledTimes(1)
  })

  it('leaves an incomplete root alone', async () => {
    document.body.innerHTML = '<div data-select-root><select data-select-native></select></div>'

    await expect(activate()).resolves.toBeUndefined()
  })

  // Listeners must not survive a view transition: one of them sits on `document`,
  // so it would keep firing against DOM the swap has replaced.
  it('unbinds every listener on astro:before-swap', async () => {
    renderSelect()
    await activate()
    const changes = vi.fn()
    native().addEventListener('change', changes)

    document.dispatchEvent(new Event('astro:before-swap'))
    trigger().click()

    expect(isOpen()).toBe(false)
    expect(changes).not.toHaveBeenCalled()
  })
})

describe('select-a11y branches', () => {
  it('leaves the trigger unnamed when the native carries no id', async () => {
    renderSelect()
    native().removeAttribute('id')
    native().removeAttribute('aria-describedby')
    await activate()

    expect(trigger().id).toBe('')
    expect(trigger().hasAttribute('aria-controls')).toBe(false)
    expect(trigger().hasAttribute('aria-describedby')).toBe(false)
  })

  it('does not claim required when the native is optional', async () => {
    renderSelect({ required: false })
    await activate()

    expect(trigger().hasAttribute('aria-required')).toBe(false)
  })
})
