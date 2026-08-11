import { createHash } from 'node:crypto'

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
// `(?<![-\w])` and not `\b`: `\bsrc` also matches `data-src`, whose script would
// lose its hash and get blocked.
const HAS_SRC = /(?<![-\w])src\s*=/i
// `script-src` doesn't govern data blocks, so they need no hash.
const DATA_TYPE = /(?<![-\w])type\s*=\s*["']?application\/(?:ld\+json|json)["']?/i

export function collectInlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>()
  // `replace` and not `matchAll`: its callback types the groups as `string`, so the
  // two unreachable `?? ''` fallbacks the coverage gate would flag never exist.
  html.replace(SCRIPT_RE, (_tag: string, attrs: string, body: string): string => {
    if (HAS_SRC.test(attrs) || DATA_TYPE.test(attrs) || body.trim() === '') return ''
    hashes.add(`sha256-${createHash('sha256').update(body).digest('base64')}`)
    return ''
  })
  return [...hashes].sort()
}

const CHARSET_RE = /<meta\b[^>]*\bcharset=[^>]*>/i
const HEAD_OPEN_RE = /<head\b[^>]*>/i

// A meta CSP governs only what follows it, so it goes right after `<meta charset>`,
// ahead of every script on the page.
export function injectCspMeta(html: string, cspContent: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`
  const anchor = CHARSET_RE.exec(html) ?? HEAD_OPEN_RE.exec(html)
  if (!anchor) return html
  const at = anchor.index + anchor[0].length
  return `${html.slice(0, at)}${meta}${html.slice(at)}`
}
