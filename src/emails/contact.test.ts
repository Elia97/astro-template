import { describe, expect, it } from 'vitest'

import type { ContactRequest } from '@/lib/contact'

import { renderContactAutoreply, renderContactNotification } from '@/emails/contact'

const baseRequest: ContactRequest = {
  firstName: 'Mario',
  lastName: 'Rossi',
  email: 'mario@example.com',
  message: '',
  consent: true,
}

describe('renderContactNotification', () => {
  it('builds the subject with the site name and the sender name', () => {
    const { subject } = renderContactNotification(baseRequest)
    expect(subject).toBe('[<PROJECT_NAME>] Nuova richiesta — Mario Rossi')
  })

  it('escapes HTML in user-provided fields', () => {
    const { html } = renderContactNotification({
      ...baseRequest,
      message: '<script>alert(1)</script>',
    })
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('falls back to the email when no name is given', () => {
    const { subject } = renderContactNotification({
      ...baseRequest,
      firstName: '',
      lastName: '',
      email: 'noname@example.com',
    })
    expect(subject).toContain('noname@example.com')
  })

  it('omits the row of an empty optional field', () => {
    const { html } = renderContactNotification(baseRequest)
    expect(html).not.toContain('Messaggio')
  })
})

describe('renderContactAutoreply', () => {
  it('tells the visitor where to write for urgent matters', () => {
    const { html } = renderContactAutoreply('info@example.com')
    expect(html).toContain('info@example.com')
  })

  it('signs with the site name', () => {
    const { subject, html } = renderContactAutoreply('info@example.com')
    expect(subject).toContain('<PROJECT_NAME>')
    expect(html).toContain('&lt;PROJECT_NAME&gt;')
  })
})
