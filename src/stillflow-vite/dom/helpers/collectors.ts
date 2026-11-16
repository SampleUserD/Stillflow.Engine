import * as vm from '@/stillflow-vite/babel-vm/index'

import { Template } from "@/stillflow-vite/dom/build-vm/template"
import { TransformResult } from "@/stillflow-vite/dom/build-vm/transform"
import { ComponentInformation, Environment, ImportInformation } from "@/stillflow-vite/dom/environment"
import { get_return_argument } from '@/stillflow-vite/dom/helpers/getters'
import { NodePath, PluginPass, types } from "@babel/core"

export function collect_template_map(root: Template): Map<Template, number> {
  const map = new Map<Template, number>()

  function walk(template: Template) {
    if (map.has(template)) {
      return
    }

    for (const sub_template of template.templates.values) {
      walk(sub_template)
    }

    map.set(template, map.size)
  }

  walk(root)

  return map
}

export function collect_transform_map(templates: Map<Template, number>): Map<TransformResult, number> {
  const index = new Map<TransformResult, number>()

  for (const template of templates.keys()) {
    if (!index.has(template.root)) {
      index.set(template.root, index.size)
    }
  }

  return index
}

export function collect_components_in(program_path: NodePath<types.Program>, state: PluginPass): Environment['components'] {
  const components = new Map<string, ComponentInformation>()

  const filename = state.filename || 'unknown'

  program_path.traverse({
    FunctionDeclaration(path) {
      if (!path.node.id) {
        return
      }

      const argument = get_return_argument(path.node)

      if (!types.isJSXElement(argument)) {
        return
      }

      components.set(path.node.id!.name, {
        node: path.node,
        parameters: path.node.params.filter(types.isIdentifier),
        body: argument,
        filename,
        scope: path.scope
      })
    },
    VariableDeclarator(path) {
      if (!types.isIdentifier(path.node.id)) {
        return
      }

      const is_value_supported = types.isFunctionExpression(path.node.init) || types.isArrowFunctionExpression(path.node.init)

      if (!is_value_supported) {
        return
      }

      const initializer = path.node.init as types.FunctionExpression | types.ArrowFunctionExpression
      const argument = get_return_argument(initializer)

      if (!types.isJSXElement(argument)) {
        return
      }

      components.set(path.node.id.name, {
        node: initializer,
        parameters: initializer.params.filter(types.isIdentifier),
        body: argument,
        filename,
        scope: path.scope
      })
    }
  })

  return components
}

export function collect_imports_in(program_path: NodePath<types.Program>): Map<string, ImportInformation> {
  const imports = new Map<string, ImportInformation>()

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

export function collect_component_in(ast: types.File, name: string, filename: string): ComponentInformation | null {
  let result: ComponentInformation | null = null

  types.traverseFast(ast, node => {
    if (result) {
      return
    }

    if (types.isExportDefaultDeclaration(node)) {
      const declaration = node.declaration

      if (types.isFunctionDeclaration(declaration)) {
        const id = declaration.id

        if (id) {
          const argument = get_return_argument(declaration)

          if (types.isJSXElement(argument)) {
            result = {
              node: declaration,
              parameters: declaration.params.filter(types.isIdentifier),
              body: argument,
              filename,
              scope: null
            }
          }
        }
      } else if (types.isArrowFunctionExpression(declaration)) {
        const argument = get_return_argument(declaration)

        if (types.isJSXElement(argument)) {
          result = {
            node: declaration,
            parameters: declaration.params.filter(types.isIdentifier),
            body: argument,
            filename,
            scope: null
          }
        }
      }
    }

    if (types.isExportNamedDeclaration(node)) {
      const declaration = node.declaration

      if (types.isFunctionDeclaration(declaration)) {
        const id = declaration.id

        if (id?.name === name) {
          const argument = get_return_argument(declaration)

          if (types.isJSXElement(argument)) {
            result = {
              node: declaration,
              parameters: declaration.params.filter(types.isIdentifier),
              body: argument,
              filename,
              scope: null
            }
          }
        }
      }

      if (types.isVariableDeclaration(declaration)) {
        declaration.declarations.forEach(declaration => {
          if (result) {
            return
          }

          const id = declaration.id

          if (types.isIdentifier(id)) {
            const id_name = id.name

            if (name === id_name) {
              const init = declaration.init

              if (types.isArrowFunctionExpression(init) || types.isFunctionExpression(init)) {
                const argument = get_return_argument(init)

                if (types.isJSXElement(argument)) {
                  result = {
                    node: init,
                    parameters: init.params.filter(types.isIdentifier),
                    body: argument,
                    filename,
                    scope: null
                  }
                }
              }
            }
          }
        })
      }
    }
  })

  return result
}
