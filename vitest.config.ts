import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// `astro:env/server` and `astro:config/client` are virtual modules that only
// exist inside the Astro runtime — unit tests resolve them to stubs
// (process.env reads / mirrored config values).
const astroEnvServerStub = fileURLToPath(new URL('./test/stubs/astro-env-server.ts', import.meta.url))
const astroConfigClientStub = fileURLToPath(new URL('./test/stubs/astro-config-client.ts', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'astro:env/server': astroEnvServerStub,
      'astro:config/client': astroConfigClientStub,
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
