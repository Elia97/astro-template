// Locale dictionary registry. Adding a locale (see HOW_TO_USE.md):
// create ./strings/<locale>.ts exporting a `Record<UIKey, string>` and
// register it here — `useTranslations` resolves by locale code.
import { it } from './strings/it'

export type { UIKey } from './strings/it'

export const dictionaries: Record<string, Record<keyof typeof it, string>> = { it }
