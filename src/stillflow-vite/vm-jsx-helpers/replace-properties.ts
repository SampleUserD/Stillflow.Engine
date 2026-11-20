import { types } from "@babel/core"

export function replace_properties(body: types.Node, properties: Record<string, types.Node>, name: string): types.Node {
  types.traverseFast(body, node => {
    if (types.isJSXExpressionContainer(node)) {
      Object.assign(node.expression, replace_properties(node.expression, properties, name))
      return
    }

    if (types.isBinaryExpression(node)) {
      Object.assign(node.left, replace_properties(node.left, properties, name))
      Object.assign(node.right, replace_properties(node.right, properties, name))
      return
    }

    if (types.isMemberExpression(node) && types.isIdentifier(node.object, { name }) && types.isIdentifier(node.property)) {
      const value = properties[node.property.name]

      if (value !== undefined) {
        Object.assign(node, value)
      }
    }
  })

  return body
}