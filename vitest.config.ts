/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { getViteConfig } from 'astro/config'

// `getViteConfig`, not vitest's `defineConfig`: it loads the Vite plugins that compile `.astro`.
const astroEnvServerStub = fileURLToPath(new URL('./test/stubs/astro-env-server.ts', import.meta.url))
const astroEnvClientStub = fileURLToPath(new URL('./test/stubs/astro-env-client.ts', import.meta.url))
const astroConfigClientStub = fileURLToPath(new URL('./test/stubs/astro-config-client.ts', import.meta.url))
const astroI18nStub = fileURLToPath(new URL('./test/stubs/astro-i18n.ts', import.meta.url))
const astroContentStub = fileURLToPath(new URL('./test/stubs/astro-content.ts', import.meta.url))
const astroActionsStub = fileURLToPath(new URL('./test/stubs/astro-actions.ts', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const testDir = fileURLToPath(new URL('./test', import.meta.url))

export default getViteConfig({
  resolve: {
    alias: {
      'astro:env/server': astroEnvServerStub,
      'astro:env/client': astroEnvClientStub,
      'astro:config/client': astroConfigClientStub,
      'astro:i18n': astroI18nStub,
      'astro:content': astroContentStub,
      'astro:actions': astroActionsStub,
      '@': srcDir,
      '@test': testDir,
    },
  },
  test: {
    // Container renders require this default — see the note in test/container.ts.
    environment: 'node',
    // [HARD] Astro routes every file in `src/pages/**`, so a test there builds as a page and
    // crashes the prerender on `vi.mock`. Page-endpoint tests live in `test/pages/` instead.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['src/pages/**/*.test.ts', 'node_modules/**'],
    // fallow's CRAP gate reads coverage/coverage-final.json, which the `json` reporter writes;
    // with no report it assumes 0% coverage.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      include: [
        'src/**/*.ts',
        'scripts/lib/**/*.ts',
        'scripts/gen/**/*.mjs',
        'test/stubs/**/*.ts',
        'src/components/layout/footer.astro',
        'src/components/home/hero.astro',
      ],
      exclude: ['**/*.test.ts', 'src/types/**', 'src/content.config.ts', 'src/lib/company.ts', 'src/i18n/strings/**'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
