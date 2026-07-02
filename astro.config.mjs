// @ts-check

import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

import { SITE } from './src/lib/site'

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  output: 'server',
  // Explicit policy: canonical/hreflang in head.astro normalize to it. The
  // default 'ignore' lets /page and /page/ both resolve with two competing
  // self-canonicals.
  trailingSlash: 'never',
  adapter: vercel(),
  // Native i18n routing: the primary locale keeps unprefixed URLs forever, so
  // adding a language later is additive (new locale entry + content), never a URL change.
  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
