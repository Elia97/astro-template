import { fontProviders } from 'astro/config'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { env } from '../env'

export const FONT_PROVIDERS: ('google' | 'fontsource' | 'local')[] = [
  'google',
  'fontsource',
  'local',
]
export type FontProvider = (typeof FONT_PROVIDERS)[number]
export type FontRole = 'sans' | 'serif' | 'mono'

export const FONT_DEFAULTS: Record<
  FontRole,
  { provider: FontProvider; name: string; localDir: string }
> = {
  sans: { provider: 'google', name: 'Inter', localDir: '' },
  serif: { provider: 'google', name: 'Lora', localDir: '' },
  mono: { provider: 'google', name: 'JetBrains Mono', localDir: '' },
}

const LOCAL_VARIANTS_CONVENTION = [
  { weight: 400, style: 'normal', file: 'Regular.woff2' },
  { weight: 400, style: 'italic', file: 'Italic.woff2' },
  { weight: 700, style: 'normal', file: 'Bold.woff2' },
  { weight: 700, style: 'italic', file: 'BoldItalic.woff2' },
] as const

export interface FontVariant {
  weight: number
  style: 'normal' | 'italic'
  src: string[]
}

export function scanLocalDir(dir: string, role: FontRole): FontVariant[] {
  if (!dir) {
    throw new Error(
      `PUBLIC_FONT_${role.toUpperCase()}_LOCAL_DIR is required when PROVIDER is 'local'`,
    )
  }
  const baseDir = resolve(process.cwd(), 'src/assets/fonts', dir)
  const variants = LOCAL_VARIANTS_CONVENTION.filter(({ file }) =>
    existsSync(resolve(baseDir, file)),
  ).map(({ weight, style, file }) => ({
    weight,
    style,
    src: [`./src/assets/fonts/${dir}/${file}`],
  }))
  if (variants.length === 0) {
    throw new Error(
      `No font files found in src/assets/fonts/${dir}/. Expected one or more of: ${LOCAL_VARIANTS_CONVENTION.map((v) => v.file).join(', ')}`,
    )
  }
  return variants
}

export function buildFontConfig(role: FontRole, envSource: Record<string, string> = env) {
  const defaults = FONT_DEFAULTS[role]
  const upper = role.toUpperCase()
  const provider = (envSource[`PUBLIC_FONT_${upper}_PROVIDER`] ?? defaults.provider) as FontProvider
  const name = envSource[`PUBLIC_FONT_${upper}_NAME`] ?? defaults.name
  const localDir = envSource[`PUBLIC_FONT_${upper}_LOCAL_DIR`] ?? defaults.localDir
  const cssVariable = `--font-${role}`

  if (provider === 'local') {
    return {
      provider: fontProviders.local(),
      name,
      cssVariable,
      options: { variants: scanLocalDir(localDir, role) },
    }
  }

  return {
    provider: fontProviders[provider](),
    name,
    cssVariable,
  }
}
