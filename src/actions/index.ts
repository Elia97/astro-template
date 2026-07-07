import { ActionError, defineAction } from 'astro:actions'
import { CONTACT_FROM_EMAIL, CONTACT_FROM_NAME, CONTACT_TO_EMAIL } from 'astro:env/server'

import { type ContactRequest, contactAttributes, contactSchema } from '@/lib/contact'
import { rateLimit } from '@/lib/rate-limit'
import { type BrevoResult, sendTransactionalEmail, upsertContact } from '@/lib/vendor/brevo'

import { renderContactAutoreply, renderContactNotification } from '@/emails/contact'

const sender = { email: CONTACT_FROM_EMAIL, name: CONTACT_FROM_NAME }

function assertNotRateLimited(clientAddress: string): void {
  if (rateLimit(`contact:${clientAddress}`)) return
  throw new ActionError({
    code: 'TOO_MANY_REQUESTS',
    message: 'Troppe richieste, riprova tra poco.',
  })
}

function sendContactEmails(input: ContactRequest): Promise<[BrevoResult, BrevoResult, BrevoResult]> {
  const notify = renderContactNotification(input)
  const auto = renderContactAutoreply(CONTACT_TO_EMAIL)
  const replyToName = [input.firstName, input.lastName].filter(Boolean).join(' ')

  return Promise.all([
    sendTransactionalEmail({
      to: [{ email: CONTACT_TO_EMAIL, name: CONTACT_FROM_NAME }],
      sender,
      replyTo: replyToName ? { email: input.email, name: replyToName } : { email: input.email },
      subject: notify.subject,
      htmlContent: notify.html,
      tags: ['contact'],
    }),
    sendTransactionalEmail({
      to: [{ email: input.email }],
      sender,
      subject: auto.subject,
      htmlContent: auto.html,
      tags: ['autoreply'],
    }),
    upsertContact({
      email: input.email,
      attributes: contactAttributes(input),
    }),
  ])
}

// Fail-loud ONLY on the owner notification (the lead would be lost) —
// autoreply and CRM upsert are best-effort, logged and swallowed.
function reportContactResults([notified, autoreplied, persisted]: [BrevoResult, BrevoResult, BrevoResult]): void {
  if (!notified.ok) {
    console.error('[contact] notification failed:', notified.error)
    throw new ActionError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Invio non riuscito, riprova.',
    })
  }
  if (!autoreplied.ok) {
    console.error('[contact] autoreply failed:', autoreplied.error)
  }
  if (!persisted.ok) {
    console.error('[contact] contact upsert failed:', persisted.error)
  }
}

export const server = {
  contact: defineAction({
    accept: 'json',
    input: contactSchema,
    handler: async (input, context) => {
      assertNotRateLimited(context.clientAddress)
      reportContactResults(await sendContactEmails(input))
      return { ok: true }
    },
  }),
}
