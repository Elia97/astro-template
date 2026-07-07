import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// `astro:env/server` is a virtual module that only exists inside the Astro
// runtime — unit tests resolve it to a stub that reads from process.env.
const astroEnvServerStub = fileURLToPath(new URL('./test/stubs/astro-env-server.ts', import.meta.url))
const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      'astro:env/server': astroEnvServerStub,
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
