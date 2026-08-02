/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { getViteConfig } from 'astro/config'

// `getViteConfig`, not vitest's own `defineConfig`: it pulls in Astro's Vite
// plugins, which are what compile `.astro` — without them a Container API render
// (test/container.ts) fails at parse.
//
// `astro:env/server`, `astro:config/client`, `astro:i18n` and `astro:content`
// are virtual modules that only exist inside the Astro runtime — unit tests
// resolve them to stubs (process.env reads / mirrored config values / minimal
// URL model / mockable collection loaders). The aliases keep winning over
// Astro's own resolution.
const astroEnvServerStub = fileURLToPath(new URL('./test/stubs/astro-env-server.ts', import.meta.url))
const astroConfigClientStub = fileURLToPath(new URL('./test/stubs/astro-config-client.ts', import.meta.url))
const astroI18nStub = fileURLToPath(new URL('./test/stubs/astro-i18n.ts', import.meta.url))
const astroContentStub = fileURLToPath(new URL('./test/stubs/astro-content.ts', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))
// Tests live next to the code in src/; shared test-only infra sits in test/.
const testDir = fileURLToPath(new URL('./test', import.meta.url))

export default getViteConfig({
  resolve: {
    alias: {
      'astro:env/server': astroEnvServerStub,
      'astro:config/client': astroConfigClientStub,
      'astro:i18n': astroI18nStub,
      'astro:content': astroContentStub,
      '@': srcDir,
      '@test': testDir,
    },
  },
  test: {
    // Node by default; DOM-dependent tests opt in per file with a
    // `// @vitest-environment happy-dom` docblock. Component renders must stay
    // on node — see the note in test/container.ts.
    environment: 'node',
    // `scripts/` is build tooling, never bundled — only the pure logic behind a
    // script is unit-tested there (scripts/lib/), never the CLI itself.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
