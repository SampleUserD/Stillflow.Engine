import { types } from "@babel/core"
import { get_function_body } from "@/stillflow-vite/vm-jsx-helpers/get-function-body"

export function get_return_argument(node: types.ArrowFunctionExpression | types.FunctionDeclaration | types.FunctionExpression): types.Node | null {
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