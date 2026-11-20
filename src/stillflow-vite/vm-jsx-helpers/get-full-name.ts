import { types } from "@babel/core"

export function get_full_name(name: types.JSXIdentifier | types.JSXMemberExpression | types.JSXNamespacedName): string {
  if (types.isJSXIdentifier(name)) {
    return name.name
  }

  if (types.isJSXMemberExpression(name)) {
    return `${get_full_name(name.object)}.${name.property.name}`
  }

  if (types.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`
  }

  return String()
}