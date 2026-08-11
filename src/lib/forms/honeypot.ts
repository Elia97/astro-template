// The hidden input in src/components/forms/honeypot-field.astro carries this name.

// [HARD] No Zod import: this reaches the client bundle, and a module-level `z.…()`
// call isn't tree-shakeable — ~12 KB gz per page, which `pnpm perf:bundle` fails on.
export const HONEYPOT_FIELD = 'website'

export function isHoneypotFilled(input: Record<typeof HONEYPOT_FIELD, string>): boolean {
  return input[HONEYPOT_FIELD].length > 0
}
