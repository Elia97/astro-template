// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { lockScroll, resetScrollLock, unlockScroll } from '@/lib/scroll-lock'

const isLocked = () => document.documentElement.hasAttribute('data-scroll-locked')

describe('scroll lock', () => {
  beforeEach(() => {
    resetScrollLock()
  })

  it('locks and unlocks the document', () => {
    lockScroll()
    expect(isLocked()).toBe(true)
    unlockScroll()
    expect(isLocked()).toBe(false)
  })

  it('keeps the lock until every nested lock is released', () => {
    lockScroll()
    lockScroll()
    unlockScroll()
    expect(isLocked()).toBe(true)
    unlockScroll()
    expect(isLocked()).toBe(false)
  })

  it('ignores unlock calls without a matching lock', () => {
    unlockScroll()
    expect(isLocked()).toBe(false)
    // A spurious unlock must not push the counter negative: the next
    // lock still has to take effect immediately.
    lockScroll()
    expect(isLocked()).toBe(true)
  })

  it('drops every lock on reset', () => {
    lockScroll()
    lockScroll()
    resetScrollLock()
    expect(isLocked()).toBe(false)
    unlockScroll()
    expect(isLocked()).toBe(false)
  })
})
