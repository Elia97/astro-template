import { renderToFragment } from '@test/container'
import { describe, expect, it } from 'vitest'

import Head from './head.astro'

// Markup contract of the head, as opposed to head-seo.test.ts, which covers the
// pure URL/meta resolution behind it. The `noindex` prop is the reason this file
// exists: it is the ONLY per-path noindex that reaches a prerendered page
// (src/middleware.ts can't — see the note there), and nothing else would catch
// the tag silently disappearing.

const props = { title: 'Page title', description: 'Page description' }

describe('head.astro', () => {
  it('emits no robots meta by default', async () => {
    const document = await renderToFragment(Head, { props })
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('emits noindex, nofollow when the prop is set', async () => {
    const document = await renderToFragment(Head, { props: { ...props, noindex: true } })
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  })

  // A noindex page still needs a canonical: the two carry different signals, and
  // dropping the canonical here would be an easy accident when editing the block.
  it('keeps title and canonical alongside the robots meta', async () => {
    const document = await renderToFragment(Head, { props: { ...props, noindex: true } })
    expect(document.querySelector('title')?.textContent).toBe('Page title')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBeTruthy()
  })
})
