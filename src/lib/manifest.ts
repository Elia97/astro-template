import { i18n } from 'astro:config/client'

import { localeTag, SITE } from '@/lib/site'

// Served from public/ — manifest.test.ts asserts every file here actually
// exists: a declared-but-missing icon is a silent 404 at install time.
//
// The template ships the SVG only, which keeps the manifest valid but NOT
// installable: Chrome's install prompt wants a raster icon of at least 192px.
// A fork adds `/icon-192.png`, `/icon-512.png` and a maskable 512 (content
// inside the centered 80% safe zone, opaque) and lists them here — the test
// then holds them to existing.
const ICONS = [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] as const

/**
 * W3C web app manifest, served by src/pages/site.webmanifest.ts. Brand values
 * come from SITE so the installed identity can't drift from the site's own.
 */
export function buildWebManifest() {
  return {
    // `id` pins the app identity across deploys: changing it makes browsers
    // treat the site as a different app and re-prompt for install.
    id: '/',
    start_url: '/',
    scope: '/',
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    lang: localeTag(i18n?.defaultLocale ?? 'it'),
    dir: 'ltr',
    display: 'standalone',
    // The manifest holds a single colour (no media queries): the light theme,
    // matching the default an install starts from.
    background_color: SITE.themeColor.light,
    theme_color: SITE.themeColor.light,
    icons: ICONS,
  }
}
