// Contact-form emails as plain HTML strings (table layout + inline styles:
// email clients ignore stylesheets). Copy is in the site's default language.
// Every user-provided value goes through escapeHtml before interpolation.
import type { ContactRequest } from '@/lib/contact'
import { SITE } from '@/lib/site'

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return value.replace(/[&<>"']/g, (c) => map[c] ?? c)
}

function layout(heading: string, body: string): string {
  return `<!doctype html><html lang="it"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-collapse:collapse">
    <tr><td style="padding:26px 30px">
      <h1 style="margin:0 0 18px;font-size:18px;font-weight:600;letter-spacing:.02em">${escapeHtml(heading)}</h1>
      ${body}
    </td></tr>
  </table></body></html>`
}

function detailRow(label: string, value?: string): string {
  if (!value) return ''
  return `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:34%;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#18181b">${escapeHtml(value)}</td></tr>`
}

function fullName(request: ContactRequest): string {
  return [request.firstName, request.lastName].filter(Boolean).join(' ').trim()
}

/** Internal notification: the site owner's copy of the request. */
export function renderContactNotification(request: ContactRequest): {
  subject: string
  html: string
} {
  const who = fullName(request) || request.email
  const rows = [
    detailRow('Nome', fullName(request)),
    detailRow('Email', request.email),
    detailRow('Messaggio', request.message),
  ].join('')
  const html = layout(
    'Nuova richiesta dal sito',
    `<table role="presentation" style="width:100%;border-collapse:collapse">${rows}</table>`,
  )
  return { subject: `[${SITE.name}] Nuova richiesta — ${who}`, html }
}

/** Autoreply to the visitor, confirming receipt. */
export function renderContactAutoreply(contactEmail: string): {
  subject: string
  html: string
} {
  const html = layout(
    'Grazie, ti abbiamo letto.',
    `<p style="margin:0;font-size:14px;line-height:1.6;color:#3f3f46">Abbiamo ricevuto la tua richiesta e ti ricontatteremo al più presto. Per qualsiasi urgenza puoi scriverci a ${escapeHtml(contactEmail)}.</p>
     <p style="margin:22px 0 0;font-size:13px;color:#71717a;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(SITE.name)}</p>`,
  )
  return { subject: `Abbiamo ricevuto la tua richiesta — ${SITE.name}`, html }
}
