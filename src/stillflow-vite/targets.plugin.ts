import { Options, Toolkit } from "@/stillflow-vite/vm-abstract"
import { CORE_TARGET_ID } from "@/stillflow-vite/vm-abstract/vm.instruction"
import { SequentalCounterFactory } from "@/stillflow-vite/vm-instruments"
import { collect_components } from "@/stillflow-vite/vm-jsx-helpers/collect-components"
import { collect_imports } from "@/stillflow-vite/vm-jsx-helpers/collect-imports"
import { find_component } from "@/stillflow-vite/vm-jsx-helpers/find-component"
import { NodePath, PluginObject, types } from "@babel/core"

export default function StillflowTargets({ node_module, path, babel, fs, parser }, options: Options) {
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

  return function StillflowTarget(): PluginObject<any> {
    return {
      name: "stillflow-aot",
      visitor: {
        Program: {
          enter(program_path, state) {
            const components = collect_components(program_path, state)
            const imports = collect_imports(program_path)
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

              const component = find_component(ast, import_info.imported_name, resolved_import)

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

            const toolkit: Toolkit = {
              context: {
                components,
                elements: jsx_elements,
                imports
              },
              target: CORE_TARGET_ID,
              counters: new SequentalCounterFactory(),
            }

            for (const jsx_path of jsx_elements.reverse()) {
              try {
                const call_path = jsx_path.parentPath
                const program = options.targets[CORE_TARGET_ID].main(jsx_path.node, toolkit, options.targets)

                if (!types.isCallExpression(call_path.node)) {
                  continue
                }

                const iife = types.callExpression(
                  types.functionExpression(
                    null,
                    [],
                    types.blockStatement(program.body)
                  ),
                  []
                )

                if (program.module.length > 0) {
                  program_path.unshiftContainer('body', program.module)
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