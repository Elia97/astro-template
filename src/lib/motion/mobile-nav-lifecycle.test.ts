// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// happy-dom's MediaQueryList can't be driven from a test, so matchMedia is
// replaced with a fake whose `change` listener we invoke by hand — the whole
// point here is what happens ON the crossing, not how the browser detects it.
let mediaListeners: Array<(event: { matches: boolean }) => void> = []

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

describe('setup guards', () => {
  it('binds nothing when the chrome is absent', async () => {
    document.body.innerHTML = '<main></main>'

    await expect(bind()).resolves.toBeUndefined()
  })

  it('does not double-wire a panel it already bound', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    const { bindMobileNav } = await import('@/lib/motion/mobile-nav')
    bindMobileNav()

    toggle.click()

    expect(panel.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
  })

  // Non-element children (text, comments) sit in body.children? They do not, but a
  // stray node must not throw the inert loop either way.
  it('survives non-element nodes beside the panel', async () => {
    const { toggle, header } = renderChrome()
    document.body.append(document.createComment('stray'))
    await bind()

    toggle.click()

    expect(header.inert).toBe(true)
  })
})

describe('teardown on view transition', () => {
  it('drops the lock and the inert flags so neither leaks into the next page', async () => {
    const { panel, toggle, header } = renderChrome()
    await bind()
    toggle.click()
    expect(isLocked()).toBe(true)

    document.dispatchEvent(new Event('astro:before-swap'))

    expect(panel.hidden).toBe(true)
    expect(isLocked()).toBe(false)
    expect(header.inert).toBe(false)
  })

  it('is safe when the panel is already gone from the DOM', async () => {
    const { panel } = renderChrome()
    await bind()
    panel.remove()

    expect(() => document.dispatchEvent(new Event('astro:before-swap'))).not.toThrow()
  })
})

describe('defensive paths', () => {
  it('ignores a panel click whose target is not an element', async () => {
    const { panel, toggle } = renderChrome()
    await bind()
    toggle.click()

    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(panel.hidden).toBe(false)
  })

  it('does not unlock a scroll it never locked', async () => {
    const { panel } = renderChrome()
    await bind()

    // close without ever opening
    panel.querySelector<HTMLElement>('[data-mobile-nav-close]')?.click()

    expect(isLocked()).toBe(false)
  })
})
