import { types } from "@babel/core"

export function get_function_body(node: types.ArrowFunctionExpression | types.FunctionDeclaration | types.FunctionExpression): types.Statement[] {
  const body = node.body

  if (types.isBlockStatement(body)) {
    return body.body
  }

  return [types.toBlock(body)]
}