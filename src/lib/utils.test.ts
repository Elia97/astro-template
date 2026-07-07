import { describe, expect, it } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins class names and resolves conditionals', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })

  it('lets the last conflicting Tailwind class win', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })

  it('merges object and array inputs', () => {
    expect(cn(['flex', { hidden: false, 'gap-2': true }])).toBe('flex gap-2')
  })
})
