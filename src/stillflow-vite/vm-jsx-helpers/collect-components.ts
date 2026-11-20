import { Component } from "@/stillflow-vite/vm-abstract"
import { get_return_argument } from "@/stillflow-vite/vm-jsx-helpers/get-return-argument"
import { NodePath, PluginPass, types } from "@babel/core"

export function collect_components(program_path: NodePath<types.Program>, state: PluginPass): Map<string, Component> {
  const components = new Map<string, Component>()

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