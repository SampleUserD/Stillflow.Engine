import { NodePath, PluginPass, Scope, types } from "@babel/core"

import { Component } from "@/stillflow-vite/vm-abstract/vm.target"

function get_function_body(node: types.ArrowFunctionExpression | types.FunctionDeclaration | types.FunctionExpression): types.Statement[] {
  const body = node.body

  if (types.isBlockStatement(body)) {
    return body.body
  }

  return [types.toBlock(body)]
}

export function get_return_argument(node: types.FunctionExpression | types.ArrowFunctionExpression | types.FunctionDeclaration): types.Node {
  const body = get_function_body(node)
  const statement = body.find(statement => types.isReturnStatement(statement)) as types.ReturnStatement

  if (!statement || !statement.argument) {
    if (types.isArrowFunctionExpression(node)) {
      return node.body
    }

    return null
  }

  return statement.argument
}

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