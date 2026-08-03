// Decoy field shared by the action schemas, the hidden input
// (src/components/forms/honeypot-field.astro) and the form behaviors — one name,
// one place.
//
// [HARD] No Zod import here. The form behaviors pull HONEYPOT_FIELD into the
// client bundle, and a module-level `z.…()` call isn't tree-shakeable — the
// schema shape therefore lives in ./honeypot-schema.ts. Merging the two back
// together ships all of Zod (~12 KB gz) to every page carrying a form, which
// `pnpm perf:bundle` fails on.
export const HONEYPOT_FIELD = 'website'

export function isHoneypotFilled(input: Record<typeof HONEYPOT_FIELD, string>): boolean {
  return input[HONEYPOT_FIELD].length > 0
}
