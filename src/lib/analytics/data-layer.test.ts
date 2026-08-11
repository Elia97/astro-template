// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { pushToDataLayer } from '@/lib/analytics/data-layer'

beforeEach(() => {
  // `delete`, not `= undefined`: exactOptionalPropertyTypes rejects undefined as a
  // value, and "absent" is the state under test.
  delete window.dataLayer
})

describe('pushToDataLayer', () => {
  it('creates the queue on the first push', () => {
    pushToDataLayer({ event: 'test' })

    expect(window.dataLayer).toEqual([{ event: 'test' }])
  })

  it('appends to an existing queue, preserving order', () => {
    pushToDataLayer({ event: 'first' })
    pushToDataLayer({ event: 'second' })

    expect(window.dataLayer).toEqual([{ event: 'first' }, { event: 'second' }])
  })

  // GTM's own snippet may have created the array before this module runs.
  it('adopts a queue it did not create', () => {
    window.dataLayer = [{ event: 'from-gtm' }]

    pushToDataLayer({ event: 'ours' })

    expect(window.dataLayer).toHaveLength(2)
  })
})
