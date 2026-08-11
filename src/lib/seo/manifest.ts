import { i18n } from 'astro:config/client'

import { localeTag, SITE } from '@/lib/site'

// Chrome's install prompt wants a raster icon of at least 192px (and a maskable 512
// with its content inside the centred 80% safe zone); the template ships the SVG only.
const ICONS = [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] as const

export function buildWebManifest() {
  return {
    // Changing `id` makes browsers treat the site as a different app: the install
    // stops updating and the prompt comes back.
    id: '/',
    start_url: '/',
    scope: '/',
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    /* v8 ignore next -- astro:config/client is injected by Astro on every render; the fallback guards a module that cannot be missing */
    lang: localeTag(i18n?.defaultLocale ?? 'it'),
    dir: 'ltr',
    display: 'standalone',
    // The manifest spec has no media queries: one colour, the light theme.
    background_color: SITE.themeColor.light,
    theme_color: SITE.themeColor.light,
    icons: ICONS,
  }
}
