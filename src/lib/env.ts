import { envField } from 'astro/config'
import { parse } from 'dotenv'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── envField helpers per lo schema astro:env ──────────────────────────

export const publicString = (default_: string) =>
  envField.string({ context: 'client', access: 'public', default: default_ })

export const publicEnum = <T extends string>(values: T[], default_: T) =>
  envField.enum({ context: 'client', access: 'public', values, default: default_ })

export const publicBoolean = (default_: boolean) =>
  envField.boolean({ context: 'client', access: 'public', default: default_ })

// ── Parser .env per astro.config.ts ───────────────────────────────────

export function loadPublicEnv(): Record<string, string> {
  const path = resolve(process.cwd(), '.env')
  if (!existsSync(path)) return {}
  const parsed = parse(readFileSync(path))
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => key.startsWith('PUBLIC_')))
}

export const env = loadPublicEnv()
