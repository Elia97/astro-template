import { describe, expect, it } from 'vitest'

import { contactSchema } from '@/lib/contact'
import { HONEYPOT_FIELD, isHoneypotFilled } from '@/lib/forms/honeypot'

describe('isHoneypotFilled', () => {
  it('reads an empty decoy as a human submission', () => {
    expect(isHoneypotFilled({ [HONEYPOT_FIELD]: '' })).toBe(false)
  })

  it('reads any value as a bot', () => {
    expect(isHoneypotFilled({ [HONEYPOT_FIELD]: 'https://spam.example' })).toBe(true)
  })
})

// The schema must ACCEPT a filled decoy: rejecting it would tell the bot which
// field gave it away. Dropping the submission is the action's job.
describe('honeypot in the contact schema', () => {
  const contact = { firstName: 'Ada', email: 'ada@example.com', message: 'Ciao', consent: true } as const

  it('defaults the decoy to empty when the client omits it', () => {
    const parsed = contactSchema.safeParse(contact)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(isHoneypotFilled(parsed.data)).toBe(false)
  })

  it('parses a filled decoy instead of erroring', () => {
    const parsed = contactSchema.safeParse({ ...contact, [HONEYPOT_FIELD]: 'spam' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(isHoneypotFilled(parsed.data)).toBe(true)
  })

  it('trims a whitespace-only decoy back to empty', () => {
    const parsed = contactSchema.safeParse({ ...contact, [HONEYPOT_FIELD]: '   ' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(isHoneypotFilled(parsed.data)).toBe(false)
  })
})
