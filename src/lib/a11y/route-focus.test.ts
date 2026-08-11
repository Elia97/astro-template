// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bindRouteFocus } from '@/lib/a11y/route-focus'

// bindRouteFocus's `bound` flag is module state: the cold-load case must run first.
function renderMain(): HTMLElement {
  document.body.innerHTML = '<main id="main-content" tabindex="-1">content</main>'
  const main = document.getElementById('main-content')
  if (!main) throw new Error('fixture: missing #main-content')
  return main
}

function swap(): void {
  document.dispatchEvent(new Event('astro:after-swap'))
}

describe('bindRouteFocus', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('leaves focus alone on the cold load — only a swap moves it', () => {
    const focus = vi.spyOn(renderMain(), 'focus')
    bindRouteFocus()
    expect(focus).not.toHaveBeenCalled()
  })

  it('focuses <main> after the swap, without scrolling', () => {
    const main = renderMain()
    const focus = vi.spyOn(main, 'focus')
    bindRouteFocus()

    swap()

    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(main)
  })

  it('leaves focus on the hash target for a cross-page anchor', () => {
    const focus = vi.spyOn(renderMain(), 'focus')
    bindRouteFocus()
    window.location.hash = '#form'

    swap()

    expect(focus).not.toHaveBeenCalled()
  })

  it('does nothing when the page has no <main>', () => {
    document.body.innerHTML = '<p>layout without a main</p>'
    bindRouteFocus()

    expect(() => swap()).not.toThrow()
  })

  it('registers the listener once across repeated binds', () => {
    const focus = vi.spyOn(renderMain(), 'focus')
    bindRouteFocus()
    bindRouteFocus()

    swap()

    expect(focus).toHaveBeenCalledTimes(1)
  })
})
