import { get_full_name } from "@/stillflow-vite/vm-jsx-helpers/get-full-name"
import { types } from "@babel/core"

export function extract_children(node: types.JSXElement) {
  const children: types.JSXElement[] = []
  const content = {
    statics: new Array<types.Expression>(),
    dynamics: new Array<types.Expression>()
  }

  for (const child of node.children) {
    if (types.isJSXText(child)) {
      content.statics.push(types.stringLiteral(child.value.replace(/\s+/g, ' ').trim()))
    } else if (types.isJSXExpressionContainer(child)) {
      if (types.isArrowFunctionExpression(child.expression)) {
        content.dynamics.push(child.expression)
      } else {
        content.statics.push(child.expression as types.Expression)
      }
    } else if (types.isJSXElement(child)) {
      children.push(child)
    }
  }

  return {
    children,
    content
  }
}

export function extract_attributes(node: types.JSXElement) {
  const properties: Record<string, types.Node> = {}

  for (const attribute of node.openingElement.attributes) {
    if (types.isJSXAttribute(attribute) === false) {
      continue
    }

    const real_attribute = attribute as types.JSXAttribute

    const attribute_name = get_full_name(real_attribute.name)
    const attribute_value = real_attribute.value

    if (types.isJSXExpressionContainer(attribute_value)) {
      properties[attribute_name] = attribute_value.expression
    } else if (attribute_value != null) {
      properties[attribute_name] = attribute_value
    }
  }

  return properties
}