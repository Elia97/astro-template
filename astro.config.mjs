// @ts-check
import { defineConfig, envField } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      PUBLIC_BRAND_PRIMARY: envField.string({
        context: 'client',
        access: 'public',
        default: 'oklch(0.65 0.2 250)',
      }),
      PUBLIC_BRAND_ACCENT: envField.string({
        context: 'client',
        access: 'public',
        default: 'oklch(0.7 0.18 30)',
      }),
      PUBLIC_BRAND_NEUTRAL: envField.string({
        context: 'client',
        access: 'public',
        default: 'oklch(0.5 0 0)',
      }),

      PUBLIC_FONT_HEADING_PROVIDER: envField.enum({
        context: 'client',
        access: 'public',
        values: ['google', 'fontsource', 'local'],
        default: 'google',
      }),
      PUBLIC_FONT_HEADING_NAME: envField.string({
        context: 'client',
        access: 'public',
        default: 'Inter',
      }),
      PUBLIC_FONT_HEADING_LOCAL_DIR: envField.string({
        context: 'client',
        access: 'public',
        default: '',
      }),

      PUBLIC_FONT_BODY_PROVIDER: envField.enum({
        context: 'client',
        access: 'public',
        values: ['google', 'fontsource', 'local'],
        default: 'google',
      }),
      PUBLIC_FONT_BODY_NAME: envField.string({
        context: 'client',
        access: 'public',
        default: 'Inter',
      }),
      PUBLIC_FONT_BODY_LOCAL_DIR: envField.string({
        context: 'client',
        access: 'public',
        default: '',
      }),

      PUBLIC_SPACING_BASE: envField.enum({
        context: 'client',
        access: 'public',
        values: ['compact', 'normal', 'comfortable'],
        default: 'normal',
      }),
      PUBLIC_RADIUS_SCALE: envField.enum({
        context: 'client',
        access: 'public',
        values: ['none', 'small', 'medium', 'large'],
        default: 'medium',
      }),
      PUBLIC_SHADOW_PRESET: envField.enum({
        context: 'client',
        access: 'public',
        values: ['none', 'flat', 'soft', 'dramatic'],
        default: 'soft',
      }),

      PUBLIC_ENABLE_DARK_MODE: envField.boolean({
        context: 'client',
        access: 'public',
        default: false,
      }),
      PUBLIC_ENABLE_VIEW_TRANSITIONS: envField.boolean({
        context: 'client',
        access: 'public',
        default: true,
      }),
    },
  },
})
