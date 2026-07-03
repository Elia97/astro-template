// Scaffolding CLI (plop harness). Generators live in scripts/gen/, templates
// in scripts/templates/. Run via `pnpm gen` (menu) or `pnpm gen:<name>`.
import componentGenerator from './scripts/gen/component.mjs'
import pageGenerator from './scripts/gen/page.mjs'

export default function (plop) {
  pageGenerator(plop)
  componentGenerator(plop)
}
