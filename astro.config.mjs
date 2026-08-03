// @ts-check

import sitemap from '@astrojs/sitemap'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, envField } from 'astro/config'

import { isExcludedFromSitemap } from './src/lib/seo/crawl-policy'
import { SITE } from './src/lib/site'

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  output: 'static',
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
  integrations: [
    // Emits sitemap-index.xml at build time; src/pages/robots.txt.ts points
    // crawlers at it. Exclusions are NOT listed here: they live in
    // src/lib/seo/crawl-policy.ts, the same module robots.txt and the middleware
    // read. The locale map mirrors SITE.localeTags so hreflang in the sitemap
    // matches the head.
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
      // Contact-form stack (src/actions + src/lib/vendor/brevo.ts). The API
      // key is optional on purpose: without it the vendor no-ops in dev and
      // refuses in production (see docs/guides/forms-email.md). Defaults below are
      // placeholders — set real values in .env / the deploy provider.
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
      // Abuse protection (Vercel BotID). NOT a kill switch for the check: BotID
      // classifies either way, this only decides what happens to a request it
      // calls a bot — false observes and logs, true rejects. Ships as false on
      // purpose: enforcing before a real browser submit has been seen passing
      // would risk swallowing leads, and a false positive is invisible to us.
      // Flip it in the deploy provider once verified.
      BOTID_ENFORCE: envField.boolean({
        context: 'server',
        access: 'public',
        default: false,
      }),
      // Consent + analytics (src/lib/consent, src/lib/analytics). All three are
      // public ids, not secrets — create them Plain on Vercel, never Sensitive:
      // a Sensitive var reaches a prebuilt pull as the literal "[SENSITIVE]".
      //
      // Optional, and gated as a set: with no GTM container and no iubenda site
      // id nothing is emitted — no CMP banner, no tags, no cookie. That is the
      // template's default state, and a fork that never adds tracking never has
      // to remove anything.
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
