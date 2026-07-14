// Shared ts-morph helpers for the generator injections (inject-config,
// inject-section).

/**
 * True if `name` is already bound in `sourceFile` as a variable, a function, or
 * an import (named or default) — the injected const/import would shadow it.
 */
export function isNameTaken(sourceFile, name) {
  if (sourceFile.getVariableDeclaration(name) || sourceFile.getFunction(name)) return true
  return sourceFile
    .getImportDeclarations()
    .some(
      (d) =>
        d.getNamedImports().some((n) => (n.getAliasNode()?.getText() ?? n.getName()) === name) ||
        d.getDefaultImport()?.getText() === name,
    )
}
