// Generator: new native Astro component following the ui-primitives recipe
// (cva variants + cn(), see docs/guides/ui-components.md). No .tsx island
// option: the base scaffold has no React runtime to generate against.
import { postGenAction } from './post-gen.mjs'

// The template emits `export const {{camelCase name}}Variants`, so the
// camel-cased name MUST be a valid (ASCII) JS identifier — '404-page' would
// generate `export const 404PageVariants`, unparseable code left on disk.
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export default function componentGenerator(plop) {
  const root = process.cwd()
  const tpl = 'scripts/templates/component'
  plop.setGenerator('component', {
    description: 'New native Astro component (cva + cn recipe)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (e.g. PriceCard):',
        validate: (value) => {
          const camel = plop.getHelper('camelCase')(String(value))
          if (!camel) return 'Component name is required'
          if (!IDENTIFIER.test(camel)) {
            return `"${value}" would generate an invalid identifier (${camel}Variants) — use ASCII letters/digits, starting with a letter`
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'area',
        message: 'Folder under src/components/ (e.g. ui, marketing):',
        default: 'ui',
        // Validate the TRANSFORMED value; also guards the bypass path, where
        // an empty '' arg would skip the default and drop files in src/components/.
        validate: (value) =>
          plop.getHelper('dashCase')(String(value)) !== '' ||
          'Area folder must contain at least one letter or digit (e.g. ui)',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/components/{{dashCase area}}/{{dashCase name}}.astro',
        templateFile: `${tpl}/component.astro.hbs`,
      },
      postGenAction(root),
    ],
  })
}
