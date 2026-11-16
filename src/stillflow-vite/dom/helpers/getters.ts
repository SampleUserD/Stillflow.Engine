import { generate, types } from "@babel/core"

export function get_string_name(name: types.JSXIdentifier | types.JSXMemberExpression | types.JSXNamespacedName): string {
  if (types.isJSXIdentifier(name)) {
    return name.name
  }

  if (types.isJSXMemberExpression(name)) {
    return `${get_string_name(name.object)}.${name.property.name}`
  }

  if (types.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`
  }

  return String()
}

export function get_tag_name(node: types.JSXElement): string {
  return get_string_name(node.openingElement.name)
}

export function get_tag_name_without_jsxdom(node: types.JSXElement): string {
  const name = node.openingElement.name

  // <div> → "div"
  if (types.isJSXIdentifier(name)) {
    return name.name
  }

  // <jsxdom.div> → "div"
  if (types.isJSXMemberExpression(name)) {
    if (types.isJSXIdentifier(name.property)) {
      return name.property.name // <-- берём последнюю часть
    }
  }

  throw new Error(`Unknown element: ${generate(name).code}`)
}

export function get_attribute_name(node: types.JSXAttribute): string {
  return get_string_name(node.name)
}

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

export function get_function_body(node: types.ArrowFunctionExpression | types.FunctionDeclaration | types.FunctionExpression): types.Statement[] {
  const body = node.body

  if (types.isBlockStatement(body)) {
    return body.body
  }

  return [types.toBlock(body)]
}