import { isValidIdentifier } from './identifier.mjs'
import { assertInjectable, injectCollection } from './inject-config.mjs'
import { postGenAction } from './post-gen.mjs'

export default function collectionGenerator(plop) {
  const root = process.cwd()
  const tpl = 'scripts/templates/collection'
  plop.setGenerator('collection', {
    description: 'New content collection (YAML data, or MD documents)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Collection name (e.g. services, blog):',
        validate: (value) => {
          const camel = plop.getHelper('camelCase')(String(value))
          if (!camel) return 'Collection name is required'
          if (!isValidIdentifier(camel)) {
            return `"${value}" would generate an invalid identifier (const ${camel}) — use ASCII letters/digits, starting with a letter, not a JS reserved word`
          }
          return true
        },
      },
      {
        type: 'confirm',
        name: 'document',
        message: 'MD documents with a renderable body? (No = YAML data)',
        default: false,
      },
    ],
    actions: (answers) => [
      (a, _config, api) => {
        assertInjectable({
          root,
          camel: api.getHelper('camelCase')(a.name),
          kebab: api.getHelper('dashCase')(a.name),
        })
        return 'content.config.ts contract checks passed'
      },
      {
        type: 'add',
        path: 'src/lib/schemas/{{dashCase name}}.ts',
        templateFile: `${tpl}/schema.ts.hbs`,
      },
      {
        type: 'add',
        path: answers.document
          ? 'src/content/{{dashCase name}}/example.md'
          : 'src/content/{{dashCase name}}/example.yml',
        templateFile: answers.document ? `${tpl}/doc.md.hbs` : `${tpl}/data.yml.hbs`,
      },
      (a, _config, api) => {
        injectCollection({
          root,
          camel: api.getHelper('camelCase')(a.name),
          kebab: api.getHelper('dashCase')(a.name),
          document: a.document,
        })
        return `injected collection in content.config.ts: ${a.name}`
      },
      postGenAction(root),
    ],
  })
}
