import { types } from "@babel/core"

export function replace_properties(body: types.JSXElement, properties: Record<string, types.Node>, name: string): types.JSXElement {
  const clone = types.cloneNode(body, true)

  types.traverseFast(clone, node => {
    if (types.isMemberExpression(node) && types.isIdentifier(node.object, { name }) && types.isIdentifier(node.property)) {
      const value = properties[node.property.name]

      if (value !== undefined) {
        Object.assign(node, value)
      }
    }
  })

  return clone
}