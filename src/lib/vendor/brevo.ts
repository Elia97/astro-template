// Brevo transactional-email/CRM client — plain fetch, no SDK. Failure is a
// value (`BrevoResult`), never a throw: the action decides which failures
// are fatal. Missing API key: dev no-ops loudly, production refuses — a
// silently dropped lead is the worst outcome.
import { getSecret } from 'astro:env/server'

const BREVO_API = 'https://api.brevo.com/v3'

// [HARD] `fetch` has no default timeout. A vendor that accepts the connection and
// then stalls holds the function open until the platform kills it — the visitor
// watches a spinner for the whole duration and the action never gets to run its
// error path. Three calls fire in parallel, so this is also the ceiling on the
// whole handler. Keep it well under `maxDuration` in vercel.json.
const REQUEST_TIMEOUT_MS = 8_000

interface EmailAddress {
  email: string
  name?: string
}

export interface SendEmailParams {
  to: EmailAddress[]
  subject: string
  htmlContent: string
  sender: EmailAddress
  replyTo?: EmailAddress
  tags?: string[]
}

export interface UpsertContactParams {
  email: string
  attributes?: Record<string, string | number | boolean>
  listIds?: number[]
}

export type BrevoResult = { ok: true; skipped?: boolean } | { ok: false; error: string }

async function brevoFetch(path: string, body: unknown): Promise<BrevoResult> {
  const key = getSecret('BREVO_API_KEY')
  if (!key) {
    if (import.meta.env.PROD) {
      return {
        ok: false,
        error: `BREVO_API_KEY unset in production — refusing to no-op POST ${path}`,
      }
    }
    console.warn(`[brevo] BREVO_API_KEY unset — skipping POST ${path} (dev/no-op)`)
    return { ok: true, skipped: true }
  }
  try {
    const res = await fetch(`${BREVO_API}${path}`, {
      method: 'POST',
      headers: {
        'api-key': key,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return {
        ok: false,
        error: `Brevo ${path} ${String(res.status)}: ${detail.slice(0, 300)}`,
      }
    }
    return { ok: true }
  } catch (cause) {
    return {
      ok: false,
      error: `Brevo ${path} request failed: ${String(cause)}`,
    }
  }
}

export function sendTransactionalEmail(params: SendEmailParams): Promise<BrevoResult> {
  return brevoFetch('/smtp/email', {
    sender: params.sender,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    htmlContent: params.htmlContent,
    tags: params.tags,
  })
}

export function upsertContact(params: UpsertContactParams): Promise<BrevoResult> {
  return brevoFetch('/contacts', {
    email: params.email,
    attributes: params.attributes,
    listIds: params.listIds,
    updateEnabled: true,
  })
}
