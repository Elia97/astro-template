import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// `astro:env/server`, `astro:config/client`, `astro:i18n` and `astro:content`
// are virtual modules that only exist inside the Astro runtime — unit tests
// resolve them to stubs (process.env reads / mirrored config values / minimal
// URL model / mockable collection loaders).
const astroEnvServerStub = fileURLToPath(new URL('./test/stubs/astro-env-server.ts', import.meta.url))
const astroConfigClientStub = fileURLToPath(new URL('./test/stubs/astro-config-client.ts', import.meta.url))
const astroI18nStub = fileURLToPath(new URL('./test/stubs/astro-i18n.ts', import.meta.url))
const astroContentStub = fileURLToPath(new URL('./test/stubs/astro-content.ts', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'astro:env/server': astroEnvServerStub,
      'astro:config/client': astroConfigClientStub,
      'astro:i18n': astroI18nStub,
      'astro:content': astroContentStub,
      '@': srcDir,
    },
  },
  test: {
    // Node by default; DOM-dependent tests opt in per file with a
    // `// @vitest-environment happy-dom` docblock.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
