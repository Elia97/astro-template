// Insertion goes ABOVE each marker: below it, Biome's organizeImports adopts the marker as leading
// trivia of the new import and relocates it into the sorted block. (.astro is not ts-morph-parseable.)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { Project, SyntaxKind } from 'ts-morph'

import { isNameTaken } from './ts-morph-utils.mjs'

const SCHEMA_BARREL = 'src/lib/schemas/homepage/index.ts'
const DATA_LAYER = 'src/lib/homepage.ts'
const INDEX_PAGE = 'src/pages/index.astro'
const IMPORTS_MARKER = '// @gen:home-imports'
const SECTIONS_MARKER = '{/* @gen:home-sections */}'
const GUIDE = 'docs/guides/content-collections.md'

function fail(where, problem) {
  throw new Error(`gen:section injection failed in ${where}: ${problem} (contract: ${GUIDE})`)
}

function locateUnionArray(project, root) {
  const barrel = project.addSourceFileAtPath(`${root}/${SCHEMA_BARREL}`)
  const fn = barrel.getFunction('homepageCollectionSchema')
  if (!fn) {
    fail(SCHEMA_BARREL, 'no `homepageCollectionSchema` function — was it renamed?')
  }
  const call = fn
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((c) => c.getExpression().getText() === 'z.discriminatedUnion')
  if (!call) {
    fail(SCHEMA_BARREL, 'no `z.discriminatedUnion(…)` call inside homepageCollectionSchema')
  }
  const arrayArg = call.getArguments()[1]
  const union = arrayArg?.asKind(SyntaxKind.ArrayLiteralExpression)
  if (!union) {
    fail(SCHEMA_BARREL, 'the second argument of z.discriminatedUnion is not an array literal')
  }
  return { barrel, union }
}

function locateReturnObject(project, root) {
  const home = project.addSourceFileAtPath(`${root}/${DATA_LAYER}`)
  const fn = home.getFunction('getHomepageSections')
  if (!fn) {
    fail(DATA_LAYER, 'no `getHomepageSections` function — was it renamed?')
  }
  const ret = fn
    .getBody()
    ?.getStatements()
    .findLast((s) => s.isKind(SyntaxKind.ReturnStatement))
  const obj = ret?.getExpression()?.asKind(SyntaxKind.ObjectLiteralExpression)
  if (!obj) {
    fail(DATA_LAYER, 'getHomepageSections has no top-level `return { … }` object literal to register the pick() in')
  }
  return obj
}

function readIndexPage(root) {
  const src = readFileSync(`${root}/${INDEX_PAGE}`, 'utf8')
  if (!src.includes(IMPORTS_MARKER)) {
    fail(INDEX_PAGE, `the \`${IMPORTS_MARKER}\` marker is missing — the import has no anchor`)
  }
  if (!src.includes(SECTIONS_MARKER)) {
    fail(INDEX_PAGE, `the \`${SECTIONS_MARKER}\` marker is missing — the component has no anchor`)
  }
  return src
}

export function assertSectionInjectable({ root, camel, kebab, pascal }) {
  const project = new Project()
  const { barrel, union } = locateUnionArray(project, root)
  if (union.getElements().some((e) => e.getText() === `${camel}SectionSchema()`)) {
    fail(SCHEMA_BARREL, `section "${camel}" is already in the union — pick another name`)
  }
  if (isNameTaken(barrel, `${camel}SectionSchema`)) {
    fail(
      SCHEMA_BARREL,
      `the identifier \`${camel}SectionSchema\` is already taken — the injected import would collide. Pick another name`,
    )
  }
  const obj = locateReturnObject(project, root)
  if (obj.getProperty(camel)) {
    fail(DATA_LAYER, `section "${camel}" is already picked in getHomepageSections`)
  }
  const src = readIndexPage(root)
  const frontmatter = src.split('---')[1] ?? ''
  if (new RegExp(`\\b${pascal}\\b`).test(frontmatter)) {
    fail(
      INDEX_PAGE,
      `the identifier \`${pascal}\` is already used in the frontmatter — the component import would collide. Pick another name`,
    )
  }
  for (const target of [
    `src/lib/schemas/homepage/${kebab}.ts`,
    `src/content/homepage/${kebab}.yml`,
    `src/components/home/${kebab}.astro`,
  ]) {
    if (existsSync(`${root}/${target}`)) {
      fail(target, 'the file already exists — remove it first or pick another name')
    }
  }
}

export function injectSection({ root, camel, kebab, pascal }) {
  const project = new Project()

  const { barrel, union } = locateUnionArray(project, root)
  if (!barrel.getImportDeclaration((d) => d.getModuleSpecifierValue() === `./${kebab}`)) {
    barrel.addImportDeclaration({
      moduleSpecifier: `./${kebab}`,
      namedImports: [`${camel}SectionSchema`],
    })
  }
  const call = `${camel}SectionSchema()`
  if (!union.getElements().some((e) => e.getText() === call)) {
    union.addElement(call)
  }

  const obj = locateReturnObject(project, root)
  if (!obj.getProperty(camel)) {
    obj.addPropertyAssignment({ name: camel, initializer: `pick('${camel}')` })
  }

  project.saveSync()

  let src = readIndexPage(root)
  const imp = `import ${pascal} from '@/components/home/${kebab}.astro'`
  if (!src.includes(imp)) {
    src = src.replace(IMPORTS_MARKER, `${imp}\n${IMPORTS_MARKER}`)
  }
  const use = `<${pascal} {...content.${camel}} />`
  if (!src.includes(use)) {
    src = src.replace(SECTIONS_MARKER, `${use}\n  ${SECTIONS_MARKER}`)
  }
  writeFileSync(`${root}/${INDEX_PAGE}`, src)
}
