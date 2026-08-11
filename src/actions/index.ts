import { ActionError, defineAction } from 'astro:actions'
import { BOTID_ENFORCE, CONTACT_FROM_EMAIL, CONTACT_FROM_NAME, CONTACT_TO_EMAIL } from 'astro:env/server'
import { checkBotId } from 'botid/server'

import { type ContactRequest, contactAttributes, contactSchema } from '@/lib/contact'
import { isHoneypotFilled } from '@/lib/forms/honeypot'
import { rateLimit } from '@/lib/forms/rate-limit'
import { type BrevoResult, sendTransactionalEmail, upsertContact } from '@/lib/vendor/brevo'

import { renderContactAutoreply, renderContactNotification } from '@/emails/contact'

const sender = { email: CONTACT_FROM_EMAIL, name: CONTACT_FROM_NAME }

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

// checkBotId() reads the request off Vercel's request context, so it takes no
// arguments — and off Vercel the challenge never runs, hence the PROD gate.
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

// [HARD] The lead-recovery line logs personal data on purpose (Brevo is the only
// sink): a fork declares it in its privacy notice or redacts `message` here.
function reportContactResults(
  input: ContactRequest,
  [notified, autoreplied, persisted]: [BrevoResult, BrevoResult, BrevoResult],
): void {
  if (!notified.ok) {
    console.error('[contact] notification failed:', notified.error)
    console.error('[contact] lead-recovery', JSON.stringify(input))
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

export interface ActionContext {
  clientAddress: string
}

export async function handleContact(input: ContactRequest, context: ActionContext): Promise<{ ok: true }> {
  if (droppedByHoneypot(input)) return { ok: true }
  assertNotRateLimited(context.clientAddress)
  await assertNotBot()
  reportContactResults(input, await sendContactEmails(input))
  return { ok: true }
}

export const server = {
  contact: defineAction({
    accept: 'json',
    input: contactSchema,
    handler: handleContact,
  }),
}
