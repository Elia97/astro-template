import { isValidIdentifier } from './identifier.mjs'
import { assertSectionInjectable, injectSection } from './inject-section.mjs'
import { postGenAction } from './post-gen.mjs'

const ROLLBACK_HINT =
  'gen:section also MODIFIED three existing files: src/lib/schemas/homepage/index.ts, ' +
  'src/lib/homepage.ts, src/pages/index.astro. Review them with `git diff`, then discard ONLY ' +
  'the injected hunks with `git checkout -p` on those paths. Then delete the generated ' +
  'schema/yml/component files. A re-run without rollback fails pre-flight with ' +
  '"already in the union".'

export default function sectionGenerator(plop) {
  const root = process.cwd()
  const tpl = 'scripts/templates/section'
  plop.setGenerator('section', {
    description: 'New homepage section (Zod schema + YAML + component + injection)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Section name (e.g. features):',
        validate: (value) => {
          const camel = plop.getHelper('camelCase')(String(value))
          if (!camel) return 'Section name is required'
          if (!isValidIdentifier(camel)) {
            return `"${value}" would generate an invalid identifier (${camel}SectionSchema) — use ASCII letters/digits, starting with a letter, not a JS reserved word`
          }
          return true
        },
      },
    ],
    actions: [
      (a, _config, api) => {
        assertSectionInjectable({
          root,
          camel: api.getHelper('camelCase')(a.name),
          kebab: api.getHelper('dashCase')(a.name),
          pascal: api.getHelper('pascalCase')(a.name),
        })
        return 'hook-point contract checks passed'
      },
      {
        type: 'add',
        path: 'src/lib/schemas/homepage/{{dashCase name}}.ts',
        templateFile: `${tpl}/schema.ts.hbs`,
      },
      {
        type: 'add',
        path: 'src/content/homepage/{{dashCase name}}.yml',
        templateFile: `${tpl}/content.yml.hbs`,
      },
      {
        type: 'add',
        path: 'src/components/home/{{dashCase name}}.astro',
        templateFile: `${tpl}/component.astro.hbs`,
      },
      (a, _config, api) => {
        injectSection({
          root,
          camel: api.getHelper('camelCase')(a.name),
          kebab: api.getHelper('dashCase')(a.name),
          pascal: api.getHelper('pascalCase')(a.name),
        })
        return `injected union + pick + index.astro: ${api.getHelper('pascalCase')(a.name)}`
      },
      postGenAction(root, ROLLBACK_HINT),
    ],
  })
}
