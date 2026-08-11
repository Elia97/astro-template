// @ts-check

import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

import { cspIntegration } from './src/lib/csp/integration'
import { isExcludedFromSitemap } from './src/lib/seo/crawl-policy'
import { SITE } from './src/lib/site'

export default defineConfig({
  site: SITE.url,
  output: 'static',
  // Astro's default 'ignore' resolves both /page and /page/, giving the two forms
  // competing self-canonicals. head.astro normalizes to whatever is set here.
  trailingSlash: 'never',
  // The documented `hover` default does nothing on touch. Astro bounds the cost of
  // `viewport` by skipping links scrolled past quickly and honouring Save-Data.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  // Above the 8s the Brevo client allows itself, far below the platform default of
  // minutes. It applies to the one `_render` function, which also serves /_image.
  adapter: vercel({ maxDuration: 20 }),
  i18n: {
    defaultLocale: 'it',
    locales: ['it'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    // Before the adapter: it rewrites the HTML under dist/client, which the adapter
    // then copies into .vercel/output/static.
    cspIntegration(),
    // Emits sitemap-index.xml, which src/pages/robots.txt.ts points crawlers at.
    // Exclusions go in src/lib/seo/crawl-policy.ts, never here.
    sitemap({
      filter: (page) => !isExcludedFromSitemap(page),
      i18n: {
        defaultLocale: 'it',
        locales: { ...SITE.localeTags },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      // Optional on purpose: without the key src/lib/vendor/brevo.ts no-ops in dev
      // and refuses in production. See docs/guides/forms-email.md.
      BREVO_API_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      CONTACT_FROM_EMAIL: envField.string({
        context: 'server',
        access: 'public',
        default: 'no-reply@example.com',
      }),
      CONTACT_FROM_NAME: envField.string({
        context: 'server',
        access: 'public',
        default: '<PROJECT_NAME>',
      }),
      CONTACT_TO_EMAIL: envField.string({
        context: 'server',
        access: 'public',
        default: 'info@example.com',
      }),
      // Not a kill switch: BotID classifies either way, this only picks what happens
      // to a request it calls a bot — false observes and logs, true rejects.
      BOTID_ENFORCE: envField.boolean({
        context: 'server',
        access: 'public',
        default: false,
      }),
      // Create these Plain on Vercel, never Sensitive: a Sensitive var reaches a
      // prebuilt pull as the literal "[SENSITIVE]".
      PUBLIC_GTM_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_IUBENDA_SITE_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_IUBENDA_COOKIE_POLICY_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
})
