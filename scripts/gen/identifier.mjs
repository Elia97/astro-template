// Shared identifier validation for the code generators (gen:collection,
// gen:section): a generated const/schema name must be a valid ASCII JS
// identifier and not a reserved word, else it produces a syntactically broken
// content.config.ts / schema.
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

const RESERVED = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

export function isValidIdentifier(camel) {
  return IDENTIFIER.test(camel) && !RESERVED.has(camel)
}
