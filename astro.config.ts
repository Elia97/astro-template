import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

import { env, publicBoolean, publicEnum, publicString } from './src/lib/env'
import { buildFontConfig, FONT_DEFAULTS, FONT_PROVIDERS } from './src/lib/theme/fonts'

const SITE_URL_DEFAULT = 'https://example.com'

export default defineConfig({
  site: env['PUBLIC_SITE_URL'] ?? SITE_URL_DEFAULT,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      PUBLIC_SITE_URL: publicString(SITE_URL_DEFAULT),

      PUBLIC_FONT_SANS_PROVIDER: publicEnum(FONT_PROVIDERS, FONT_DEFAULTS.sans.provider),
      PUBLIC_FONT_SANS_NAME: publicString(FONT_DEFAULTS.sans.name),
      PUBLIC_FONT_SANS_LOCAL_DIR: publicString(FONT_DEFAULTS.sans.localDir),

      PUBLIC_FONT_SERIF_PROVIDER: publicEnum(FONT_PROVIDERS, FONT_DEFAULTS.serif.provider),
      PUBLIC_FONT_SERIF_NAME: publicString(FONT_DEFAULTS.serif.name),
      PUBLIC_FONT_SERIF_LOCAL_DIR: publicString(FONT_DEFAULTS.serif.localDir),

      PUBLIC_FONT_MONO_PROVIDER: publicEnum(FONT_PROVIDERS, FONT_DEFAULTS.mono.provider),
      PUBLIC_FONT_MONO_NAME: publicString(FONT_DEFAULTS.mono.name),
      PUBLIC_FONT_MONO_LOCAL_DIR: publicString(FONT_DEFAULTS.mono.localDir),

      PUBLIC_ENABLE_DARK_MODE: publicBoolean(true),
      PUBLIC_ENABLE_VIEW_TRANSITIONS: publicBoolean(true),
    },
  },
  fonts: [
    buildFontConfig('sans') as never,
    buildFontConfig('serif') as never,
    buildFontConfig('mono') as never,
  ],
})
