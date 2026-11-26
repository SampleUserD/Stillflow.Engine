import { NodePath, types } from "@babel/core"

import { Import } from "@/stillflow-vite/vm-abstract/vm.target"

export function collect_imports(program_path: NodePath<types.Program>): Map<string, Import> {
  const imports = new Map<string, Import>()

  program_path.traverse({
    ImportDeclaration(path) {
      const source = path.node.source.value

      for (const specifier of path.node.specifiers) {
        if (types.isImportDefaultSpecifier(specifier)) {
          imports.set(specifier.local.name, {
            source,
            imported_name: 'default',
            is_default: true
          })
        } else if (types.isImportSpecifier(specifier)) {
          imports.set(specifier.local.name, {
            source,
            imported_name: types.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value,
            is_default: false
          })
        } else if (types.isImportNamespaceSpecifier(specifier)) {
          throw new Error(`Does not support import namespaces`)
        }
      }
    }
  })

  return imports
}