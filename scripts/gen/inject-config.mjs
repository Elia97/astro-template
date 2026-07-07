// AST injection into src/content.config.ts (ts-morph).
//
// CONTRACT (see docs/guides/content-collections.md): the file must contain
// `export const collections = { … }` — exported, initialized with an object
// literal. Every lookup that can fail throws a DESCRIPTIVE error — a broken
// or renamed hook point must abort the generator, never silently no-op.
import { Project, SyntaxKind } from 'ts-morph'

const CONFIG_PATH = 'src/content.config.ts'

function loadConfig(root) {
  const project = new Project()
  return project.addSourceFileAtPath(`${root}/${CONFIG_PATH}`)
}

function isNameTaken(cfg, name) {
  if (cfg.getVariableDeclaration(name)) return true
  return cfg
    .getImportDeclarations()
    .some(
      (d) =>
        d.getNamedImports().some((n) => (n.getAliasNode()?.getText() ?? n.getName()) === name) ||
        d.getDefaultImport()?.getText() === name,
    )
}

function locateContract(cfg, { camel, kebab }) {
  const statement = cfg.getVariableStatement((s) => s.getDeclarations().some((d) => d.getName() === 'collections'))
  if (!statement) {
    throw new Error(
      `gen:collection injection failed: no \`collections\` variable in ${CONFIG_PATH}. ` +
        `The contract expects \`export const collections = { … }\` — if it was renamed, ` +
        `restore it or update scripts/gen/inject-config.mjs (see docs/guides/content-collections.md).`,
    )
  }
  if (!statement.hasExportKeyword()) {
    throw new Error(
      `gen:collection injection failed: \`collections\` in ${CONFIG_PATH} is not exported. ` +
        `Astro silently ignores a non-exported collections object — restore \`export const collections\`.`,
    )
  }
  const object = cfg
    .getVariableDeclarationOrThrow('collections')
    .getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
  if (!object) {
    throw new Error(
      `gen:collection injection failed: \`collections\` in ${CONFIG_PATH} is not initialized ` +
        `with an object literal, so there is no place to register the new collection.`,
    )
  }
  if (object.getProperty(camel) || object.getProperty(`'${kebab}'`)) {
    throw new Error(
      `gen:collection injection failed: a collection named "${kebab}" is already registered ` +
        `in ${CONFIG_PATH}. Pick another name, or remove the existing entry first.`,
    )
  }
  if (isNameTaken(cfg, camel)) {
    throw new Error(
      `gen:collection injection failed: the identifier \`${camel}\` is already taken in ` +
        `${CONFIG_PATH} (import or variable) — the injected const would shadow it. Pick another name.`,
    )
  }
  return { statement, object }
}

/**
 * Pre-flight: run every contract/collision check WITHOUT touching anything.
 * Called as the generator's first action, before any file is written.
 */
export function assertInjectable({ root, camel, kebab }) {
  locateContract(loadConfig(root), { camel, kebab })
}

export function injectCollection({ root, camel, kebab, document }) {
  const cfg = loadConfig(root)
  const { statement, object } = locateContract(cfg, { camel, kebab })

  if (!cfg.getImportDeclaration((d) => d.getModuleSpecifierValue() === `@/lib/schemas/${kebab}`)) {
    cfg.addImportDeclaration({
      moduleSpecifier: `@/lib/schemas/${kebab}`,
      namedImports: [`${camel}Schema`],
    })
  }

  const pattern = document ? '**/*.md' : '**/*.{yaml,yml}'
  cfg.insertStatements(
    statement.getChildIndex(),
    `const ${camel} = defineCollection({\n` +
      `  loader: glob({\n` +
      `    pattern: '${pattern}',\n` +
      `    base: './src/content/${kebab}',\n` +
      `    // Raw relative path minus extension — same rationale as the homepage\n` +
      `    // collection (default generateId slugifies segments, honors a \`slug\`\n` +
      `    // key before zod and strips /index).\n` +
      `    generateId: ({ entry }) => entry.replace(/\\.(${document ? 'md' : 'yaml|yml'})$/, ''),\n` +
      `  }),\n` +
      `  schema: ${camel}Schema,\n` +
      `})\n`,
  )

  if (kebab.includes('-')) {
    object.addPropertyAssignment({ name: `'${kebab}'`, initializer: camel })
  } else {
    object.addShorthandPropertyAssignment({ name: camel })
  }

  cfg.saveSync()
}
