import { renderToFragment } from '@test/container'
import { describe, expect, it } from 'vitest'

import Head from './head.astro'

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

  it('keeps title and canonical alongside the robots meta', async () => {
    const document = await renderToFragment(Head, { props: { ...props, noindex: true } })
    expect(document.querySelector('title')?.textContent).toBe('Page title')
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBeTruthy()
  })
})
