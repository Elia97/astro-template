import { PUBLIC_IUBENDA_COOKIE_POLICY_ID } from 'astro:env/client'
import { z } from 'astro/zod'

// Hosted legal documents, fetched from iubenda at build time. Gated like the
// Brevo stack: with no policy id configured this no-ops and the pages render
// their own placeholder copy — which is the template's default state.
//
// Multi-locale: each language version of an iubenda policy has its own id. Add a
// `PUBLIC_IUBENDA_COOKIE_POLICY_ID_<LOCALE>` env per language and select on it
// here, the same way src/lib/analytics/tracking.ts does for the cookie policy.

export type LegalDocKind = 'privacy' | 'cookie-policy'

function policyId(): string {
  const id = PUBLIC_IUBENDA_COOKIE_POLICY_ID ?? ''
  // iubenda ids are numeric. Vercel "sensitive" vars reach prebuilt pulls as
  // the literal string [SENSITIVE]: any non-numeric value would build a 404
  // API URL — treat it as unset, loudly, instead of fetching garbage.
  if (id !== '' && !/^\d+$/.test(id)) {
    console.error('[legal] ignoring non-numeric iubenda policy id (misconfigured env?)')
    return ''
  }
  return id
}

// no-markup variant: semantic HTML without the iubenda widget's JS/CSS scaffolding,
// so it renders as our own sanitized markup (no client script, no CSP change).
function apiUrl(kind: LegalDocKind, id: string): string {
  return kind === 'privacy'
    ? `https://www.iubenda.com/api/privacy-policy/${id}/no-markup`
    : `https://www.iubenda.com/api/privacy-policy/${id}/cookie-policy/no-markup`
}

const envelopeSchema = z.object({ success: z.literal(true), content: z.string().min(1) })

/**
 * [HARD] The no-markup document is injected with `set:html` into a prerendered
 * page — an XSS sink baked into the static HTML. iubenda content is trusted, but
 * the site CSP is `script-src 'self' 'unsafe-inline'` (no nonce, no hash), so an
 * inline `<script>` or an `on*` handler WOULD execute. Don't rely on the CSP:
 * strip active markup here as defense in depth.
 *
 * Regex sanitization is a pragmatic backstop for iubenda's structured output,
 * not a general-purpose sanitizer — don't reuse it for arbitrary HTML.
 * (`<img>` are dropped too: decorative provider icons on signed S3 URLs, whose
 * hosts are outside the CSP.)
 */
export function sanitizeLegalHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(iframe|object|embed)\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi, '$1=$2#')
}

/** Fetched at build time (the legal pages are prerendered). null → the page
 *  renders its placeholder fallback. */
export async function getLegalDoc(kind: LegalDocKind): Promise<string | null> {
  const id = policyId()
  if (id === '') return null
  try {
    const res = await fetch(apiUrl(kind, id), { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`iubenda API ${String(res.status)}`)
    const envelope = envelopeSchema.safeParse(await res.json())
    if (!envelope.success) throw new Error('unexpected API envelope', { cause: envelope.error })
    return sanitizeLegalHtml(envelope.data.content)
  } catch (cause) {
    // Never swallow: the fallback would otherwise ship a degraded compliance
    // page with no trace anywhere — the fetch happens at build time, so the
    // build log is the only place this can surface.
    console.error(`[legal] ${kind}: iubenda no-markup fetch failed — rendering placeholder fallback:`, cause)
    return null
  }
}
