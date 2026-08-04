// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// happy-dom's MediaQueryList can't be driven from a test, so matchMedia is
// replaced with a fake whose `change` listener we invoke by hand — the whole
// point here is what happens ON the crossing, not how the browser detects it.
let mediaListeners: Array<(event: { matches: boolean }) => void> = []

function crossToDesktop(isDesktop: boolean): void {
  for (const listener of mediaListeners) listener({ matches: isDesktop })
}

function renderChrome(): { panel: HTMLElement; toggle: HTMLButtonElement; header: HTMLElement } {
  document.body.innerHTML = `
    <header id="site-header"><button data-mobile-nav-toggle aria-expanded="false">menu</button></header>
    <main id="main-content"><a href="/altro">altro</a></main>
    <div id="mobile-nav" data-mobile-nav hidden role="dialog" aria-modal="true">
      <button data-mobile-nav-close>chiudi</button>
      <a href="/contatti">contatti</a>
    </div>`
  return {
    panel: document.querySelector<HTMLElement>('[data-mobile-nav]') as HTMLElement,
    toggle: document.querySelector<HTMLButtonElement>('[data-mobile-nav-toggle]') as HTMLButtonElement,
    header: document.querySelector<HTMLElement>('#site-header') as HTMLElement,
  }
}

async function bind(): Promise<void> {
  const { bindMobileNav } = await import('@/lib/motion/mobile-nav')
  bindMobileNav()
}

const isLocked = (): boolean => document.documentElement.hasAttribute('data-scroll-locked')

beforeEach(() => {
  mediaListeners = []
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => {
      mediaListeners.push(listener)
    },
    removeEventListener: () => {
      mediaListeners = []
    },
  }))
  vi.resetModules()
})

afterEach(() => {
  document.documentElement.removeAttribute('data-scroll-locked')
  vi.unstubAllGlobals()
})

describe('mobile nav', () => {
  it('opens: unhides the panel, locks scroll and inerts the rest of the page', async () => {
    const { panel, toggle, header } = renderChrome()
    await bind()

    toggle.click()

    expect(panel.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(isLocked()).toBe(true)
    expect(header.inert).toBe(true)
    expect(panel.inert).toBe(false)
  })

  it('closes on Escape and hands everything back', async () => {
    const { panel, toggle, header } = renderChrome()
    await bind()
    toggle.click()

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(panel.hidden).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(isLocked()).toBe(false)
    expect(header.inert).toBe(false)
  })

  it('closes when a nav link is followed, so the panel never covers the next page', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    toggle.click()

    panel.querySelector('a')?.click()

    expect(panel.hidden).toBe(true)
    expect(isLocked()).toBe(false)
  })
})

// The regression: the panel and the toggle are both `md:hidden`, so crossing the
// breakpoint while open used to leave the lock on and the background inert with
// no visible control to undo either — a frozen page, one phone rotation away.
describe('mobile nav across the desktop breakpoint', () => {
  it('closes itself when the viewport grows past md', async () => {
    const { panel, toggle, header } = renderChrome()
    await bind()
    toggle.click()
    expect(isLocked()).toBe(true)

    crossToDesktop(true)

    expect(panel.hidden).toBe(true)
    expect(isLocked()).toBe(false)
    expect(header.inert).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('leaves a closed panel alone', async () => {
    const { panel } = renderChrome()
    await bind()

    crossToDesktop(true)

    expect(panel.hidden).toBe(true)
    expect(isLocked()).toBe(false)
  })
})

describe('closing paths', () => {
  it('closes on the explicit close button', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    toggle.click()

    panel.querySelector<HTMLElement>('[data-mobile-nav-close]')?.click()

    expect(panel.hidden).toBe(true)
    expect(isLocked()).toBe(false)
  })

  it('ignores a click on the panel chrome itself', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    toggle.click()

    panel.click()

    expect(panel.hidden).toBe(false)
  })

  it('restores focus to whatever was focused before it opened', async () => {
    const { toggle } = renderChrome()
    await bind()
    const before = document.querySelector<HTMLElement>('#main-content a') as HTMLElement
    before.focus()

    toggle.click()
    toggle.click()

    expect(document.activeElement).toBe(before)
  })
})

describe('keyboard inside the panel', () => {
  it('does nothing while the panel is hidden', async () => {
    const { panel } = renderChrome()
    await bind()

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))

    expect(isLocked()).toBe(false)
  })

  // Tab is delegated to the shared focus trap; the assertion is that it is wired,
  // not that cycleFocus works — trap-focus.test.ts owns that.
  it('handles Tab without closing the panel', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    toggle.click()

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))

    expect(panel.hidden).toBe(false)
  })

  it('ignores a key it does not handle', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    toggle.click()

    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }))

    expect(panel.hidden).toBe(false)
  })
})
