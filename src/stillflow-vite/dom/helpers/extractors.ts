import { get_attribute_name } from "@/stillflow-vite/dom/helpers/getters"
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
      content.statics.push(child.expression as types.Expression)
    } else if (types.isArrowFunctionExpression(child)) {
      content.dynamics.push(child)
    } else if (types.isJSXElement(child)) {
      children.push(child)
    }
  }

  return {
    children,
    content
  }
}

export function extract_attributes(opening: types.JSXElement['openingElement']) {
  const properties: Record<string, types.Node> = {}

  for (const attribute of opening.attributes) {
    if (types.isJSXAttribute(attribute) === false) {
      continue
    }

    const real_attribute = attribute as types.JSXAttribute

    const attribute_name = get_attribute_name(real_attribute)
    const attribute_value = real_attribute.value

    if (types.isJSXExpressionContainer(attribute_value)) {
      properties[attribute_name] = attribute_value.expression
    } else if (attribute_value != null) {
      properties[attribute_name] = attribute_value
    }
  }

  return {
    properties
  }
}