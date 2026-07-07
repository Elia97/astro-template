// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { cycleFocus } from '@/lib/trap-focus'

function renderButtons(count: number): HTMLButtonElement[] {
  document.body.innerHTML = ''
  return Array.from({ length: count }, () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    return button
  })
}

function tabEvent(shiftKey: boolean): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true })
}

describe('cycleFocus', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('wraps Tab from the last element back to the first', () => {
    const buttons = renderButtons(3)
    buttons[2]?.focus()
    const event = tabEvent(false)
    cycleFocus(buttons, event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(buttons[0])
  })

  it('wraps Shift+Tab from the first element to the last', () => {
    const buttons = renderButtons(3)
    buttons[0]?.focus()
    const event = tabEvent(true)
    cycleFocus(buttons, event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(buttons[2])
  })

  it('leaves Tab alone in the middle of the list', () => {
    const buttons = renderButtons(3)
    buttons[1]?.focus()
    const event = tabEvent(false)
    cycleFocus(buttons, event)
    expect(event.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(buttons[1])
  })

  it('does nothing with an empty list', () => {
    const event = tabEvent(false)
    cycleFocus([], event)
    expect(event.defaultPrevented).toBe(false)
  })
})
