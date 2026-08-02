import { ActionError, defineAction } from 'astro:actions'
import { BOTID_ENFORCE, CONTACT_FROM_EMAIL, CONTACT_FROM_NAME, CONTACT_TO_EMAIL } from 'astro:env/server'
import { checkBotId } from 'botid/server'

import { type ContactRequest, contactAttributes, contactSchema } from '@/lib/contact'
import { isHoneypotFilled } from '@/lib/honeypot'
import { rateLimit } from '@/lib/rate-limit'
import { type BrevoResult, sendTransactionalEmail, upsertContact } from '@/lib/vendor/brevo'

import { renderContactAutoreply, renderContactNotification } from '@/emails/contact'

const sender = { email: CONTACT_FROM_EMAIL, name: CONTACT_FROM_NAME }

// Cheapest guard, so it runs first: a filled decoy never reaches the vendor, and
// the caller still gets the success shape — an error would tell the bot which
// field gave it away.
function droppedByHoneypot(input: Parameters<typeof isHoneypotFilled>[0]): boolean {
  if (!isHoneypotFilled(input)) return false
  console.warn('[contact] honeypot filled — submission dropped')
  return true
}

function assertNotRateLimited(clientAddress: string): void {
  if (rateLimit(`contact:${clientAddress}`)) return
  throw new ActionError({
    code: 'TOO_MANY_REQUESTS',
    message: 'Troppe richieste, riprova tra poco.',
  })
}

// BotID reads the request off Vercel's request context, so there's nothing to
// pass here. Gated on PROD like its client half (src/components/forms/botid.ts):
// off Vercel the challenge never runs. Fail-open on a thrown check — a guard
// that breaks must never cost a lead.
async function detectBot(): Promise<boolean> {
  if (!import.meta.env.PROD) return false
  try {
    const { isBot } = await checkBotId()
    return isBot
  } catch (error) {
    console.error('[contact] bot check failed:', error)
    return false
  }
}

// Observe by default (BOTID_ENFORCE=false): the verdict is logged and the
// submission proceeds, so a misclassified human never loses a lead — the log is
// what tells us whether enforcing is safe here. Enforcing fails loud rather than
// faking success, so the user keeps the phone/email fallback in play. That is
// the opposite of the honeypot, whose whole value is silence.
async function assertNotBot(): Promise<void> {
  if (!(await detectBot())) return
  if (!BOTID_ENFORCE) {
    console.warn('[contact] bot detected — observe mode, submission allowed (BOTID_ENFORCE=false)')
    return
  }
  console.warn('[contact] bot detected — submission rejected')
  throw new ActionError({
    code: 'FORBIDDEN',
    message: 'Verifica di sicurezza non superata, riprova.',
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
      if (droppedByHoneypot(input)) return { ok: true }
      assertNotRateLimited(context.clientAddress)
      await assertNotBot()
      reportContactResults(await sendContactEmails(input))
      return { ok: true }
    },
  }),
}
