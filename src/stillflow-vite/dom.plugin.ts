import type { NodePath, PluginObject, types } from "@babel/core"

import { Environment } from "@/stillflow-vite/dom/environment"
import { build_dom_from } from "@/stillflow-vite/dom/build-vm/build.dom"
import { collect_component_in, collect_components_in, collect_imports_in, collect_template_map, collect_transform_map } from "@/stillflow-vite/dom/helpers/collectors"
import { create_compiler } from "@/stillflow-vite/dom/build-vm/compile"
import { get_return_argument } from "@/stillflow-vite/dom/helpers/getters"
import { build_module_from } from "@/stillflow-vite/dom/build-vm/build"

export default function StillflowDOMFabric({ node_module, path, babel, fs, parser }) {
  const { existsSync, readFileSync, statSync } = fs
  const { types } = babel
  const { parse } = parser
  const { createRequire } = node_module

  const require = createRequire(import.meta.url)

  function resolve_import(source: string, filename: string): string | Error {
    try {
      return require.resolve(source, { paths: [path.dirname(filename)] })
    } catch (error) {

      const base = path.resolve(path.dirname(filename), source)
      const extensions = ['.ts', '.tsx', '.jsx', '.js']

      for (const extension of extensions) {
        const fullname = base + extension

        if (existsSync(fullname)) {
          return fullname
        }
      }

      if (existsSync(base) && statSync(base).isDirectory()) {
        for (const extension of extensions) {
          const fullname = path.join(base, `index${extension}`)

          if (existsSync(fullname)) {
            return fullname
          }
        }
      }

      return error
    }
  }

  return function StillflowDOM(): PluginObject<any> {
    return {
      name: "stillflow-aot",
      visitor: {
        Program: {
          enter(program_path, state: Environment) {
            const components = collect_components_in(program_path, state)
            const imports = collect_imports_in(program_path)
            const filename = state.filename || 'unknown'

            for (const [local_name, import_info] of imports) {
              if (components.has(local_name)) {
                continue
              }

              const resolved_import = resolve_import(import_info.source, filename)

              if (resolved_import instanceof Error) {
                console.error(`[stillflow] Could not import file "${import_info.source}: "`, resolved_import)
                continue
              }

              const source = readFileSync(resolved_import, 'utf-8')

              const ast = parse(source, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript'],
              })

              if (ast == null) {
                console.warn(`[stillflow] File is not found: ${resolved_import}`)
                return
              }

              const component = collect_component_in(ast, import_info.imported_name, resolved_import)

              if (component) {
                components.set(local_name, component)
              }
            }

            const jsx_elements: NodePath<types.JSXElement>[] = []

            program_path.traverse({
              CallExpression(path) {
                if (!types.isIdentifier(path.node.callee, { name: '$' })) {
                  return
                }

                const argument = path.node.arguments

                if (argument.length !== 1) {
                  return
                }

                if (!types.isJSXElement(argument[0])) {
                  return
                }

                const jsx_path = path.get('arguments.0') as NodePath<types.JSXElement>

                jsx_elements.push(jsx_path)
              }
            })

            state.components = components
            state.elements = jsx_elements
            state.expanding = new Map()
            state.template_map = new Map()
            state.transform_map = new Map()

            const { elements } = state

            const compiler = create_compiler(ast => {
              const supported =
                types.isArrowFunctionExpression(ast) ||
                types.isFunctionExpression(ast) ||
                types.isFunctionDeclaration(ast)

              if (!supported) {
                throw new Error('sf:each must be an arrow/function expression')
              }

              const argument = get_return_argument(ast as any)

              if (types.isJSXElement(argument)) {
                return build_dom_from(argument as any, state)
              }

              throw new Error(`sf:each must return JSX-element`)
            })

            compiler.bind(state)

            for (const jsx_path of elements.reverse()) {
              try {
                const dom = build_dom_from(jsx_path.node, state)

                const template = compiler.compile(dom)

                state.template_map = collect_template_map(template)
                state.transform_map = collect_transform_map(state.template_map)

                const program = build_module_from(template, state)

                const call_path = jsx_path.parentPath

                if (!types.isCallExpression(call_path.node)) {
                  continue
                }

                const iife = types.callExpression(
                  types.functionExpression(
                    null,
                    [],
                    types.blockStatement(
                      program.body.filter(statement => !types.isImportDeclaration(statement)),
                    )
                  ),
                  []
                )

                const imports = program.body.filter(statement => types.isImportDeclaration(statement))

                if (imports.length > 0) {
                  program_path.unshiftContainer('body', imports)
                }

                call_path.replaceWith(iife)
              } catch (error) {
                console.error(`[stillflow] Failed to compile JSX in ${state.filename}: `, error)
              }
            }

            program_path.traverse({
              JSXElement(path) {
                path.replaceWith(types.nullLiteral())
              }
            })
          }
        }
      }
    }
  }
}