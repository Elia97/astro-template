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
  // Pairs with <ClientRouter />, which is already paid for and without this only
  // buys a cross-fade — part of the prefetch code ships inside it either way.
  // `viewport` over the documented `hover` default because hover does nothing on
  // a phone, which is most of the traffic these sites get; Astro skips links
  // scrolled past quickly and honours Save-Data, so the waste is bounded. On a
  // fork whose pages list many links (a blog index), drop back to `hover`.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  // maxDuration bounds the blast radius of a stuck upstream: the platform default
  // is minutes, and one hanging vendor call would burn all of it while the visitor
  // stares at a spinner. Above the 8s the Brevo client allows itself, far below
  // the default. It applies to the single `_render` function, which also serves
  // /_image and /_server-islands — raise it if a fork puts real work there.
  adapter: vercel({ maxDuration: 20 }),
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
