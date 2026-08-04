/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { getViteConfig } from 'astro/config'

// `getViteConfig`, not vitest's own `defineConfig`: it pulls in Astro's Vite
// plugins, which are what compile `.astro` — without them a Container API render
// (test/container.ts) fails at parse.
//
// `astro:env/server`, `astro:env/client`, `astro:config/client`, `astro:i18n`,
// `astro:content` and `astro:actions` are virtual modules that only exist inside
// the Astro runtime — unit tests resolve them to stubs (process.env reads /
// mirrored config values / minimal URL model / mockable collection loaders / the
// error classes and guards the action layer throws). The aliases keep winning
// over Astro's own resolution.
const astroEnvServerStub = fileURLToPath(new URL('./test/stubs/astro-env-server.ts', import.meta.url))
const astroEnvClientStub = fileURLToPath(new URL('./test/stubs/astro-env-client.ts', import.meta.url))
const astroConfigClientStub = fileURLToPath(new URL('./test/stubs/astro-config-client.ts', import.meta.url))
const astroI18nStub = fileURLToPath(new URL('./test/stubs/astro-i18n.ts', import.meta.url))
const astroContentStub = fileURLToPath(new URL('./test/stubs/astro-content.ts', import.meta.url))
const astroActionsStub = fileURLToPath(new URL('./test/stubs/astro-actions.ts', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))
// Tests live next to the code in src/; shared test-only infra sits in test/.
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
    // Node by default; DOM-dependent tests opt in per file with a
    // `// @vitest-environment happy-dom` docblock. Component renders must stay
    // on node — see the note in test/container.ts.
    environment: 'node',
    // `scripts/` is build tooling, never bundled. What is unit-tested there is
    // the logic behind a script (scripts/lib/) and the generators' injection and
    // wiring (scripts/gen/) — never a CLI entry point.
    //
    // [HARD] `src/pages/**` is the ONE place a test may not sit next to its
    // subject: Astro routes every file there, so `robots.txt.test.ts` builds as
    // the page `/robots.txt.test` and the prerender crashes on `vi.mock`. Tests
    // for page endpoints live in `test/pages/` instead.
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['src/pages/**/*.test.ts', 'node_modules/**'],
    // Coverage exists for `fallow audit`, not as a number to chase: its CRAP
    // gate is cyclomatic² × (1 − coverage)³ + cyclomatic, so with no report it
    // assumes 0% and a well-tested branchy function scores as untested. The
    // `json` reporter is the one fallow reads (coverage/coverage-final.json).
    //
    // Scoped to LOGIC. MOST `.astro` files are markup with near-zero cyclomatic
    // complexity, so covering them cannot move a CRAP score — chasing all of them
    // to 100% would buy ~45 render tests to maintain and prevent no bug. The
    // exceptions are the two templates branchy enough that fallow flags them, and
    // both branch on something worth pinning: footer.astro gates the
    // cookie-preferences link (a [HARD] consent invariant) and hero.astro ranks
    // its ctas by position. Same for data and config modules: a test that imports
    // them asserts nothing. What stays in is what CRAP actually gates.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      // `scripts/gen/**` is in because it is the opposite case: ts-morph
      // injection is branchy, it edits the repo's own hook points, and its
      // failure mode is a half-written tree. `test/stubs/**` is in because the
      // stubs stand in for the Astro runtime — an unexercised path there is
      // either dead or a lie every test leaning on it inherits.
      include: [
        'src/**/*.ts',
        'scripts/lib/**/*.ts',
        'scripts/gen/**/*.mjs',
        'test/stubs/**/*.ts',
        'src/components/layout/footer.astro',
        'src/components/home/hero.astro',
      ],
      exclude: [
        '**/*.test.ts',
        'src/types/**', // ambient declarations
        'src/content.config.ts', // collection definitions, executed by the Astro build
        'src/lib/company.ts', // registry data
        'src/i18n/strings/**', // translation dictionaries
      ],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
})
