// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { bindLinkTracking, resolveLinkEvent } from '@/lib/analytics/link-tracking'

beforeEach(() => {
  window.dataLayer = []
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('resolveLinkEvent', () => {
  it('names the two contact intents worth measuring', () => {
    expect(resolveLinkEvent('tel:+390123456789')).toBe('click_to_call')
    expect(resolveLinkEvent('mailto:info@example.com')).toBe('click_to_email')
  })

  it('ignores ordinary navigation', () => {
    for (const href of ['/contatti', 'https://example.com', '#form', '']) {
      expect(resolveLinkEvent(href), href).toBeNull()
    }
  })
})

describe('bindLinkTracking', () => {
  it('emits an event for a click anywhere inside the anchor', () => {
    document.body.innerHTML = '<a href="tel:+390123456789"><span>Chiama</span></a>'
    bindLinkTracking()

    document.querySelector('span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(window.dataLayer?.[0]).toMatchObject({
      event: 'click_to_call',
      link_url: 'tel:+390123456789',
    })
  })

  it('stays silent on a link that is not a contact intent', () => {
    document.body.innerHTML = '<a href="/contatti">Contatti</a>'
    bindLinkTracking()

    document.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(window.dataLayer).toHaveLength(0)
  })

  it('stays silent on a click that hits no link at all', () => {
    document.body.innerHTML = '<p>testo</p>'
    bindLinkTracking()

    document.querySelector('p')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(window.dataLayer).toHaveLength(0)
  })
})
