import { Transform } from "@/stillflow-vite/vm-compiler/vmc.transform"
import { $map, RawNode } from "@/stillflow-vite/target-dom/dom-phases/phase.raw"
import { types } from "@babel/core"

export interface SortoutNode extends Omit<RawNode, 'children'> {
  children: SortoutNode[],
  dynamics: types.Expression[]
  statics: types.Expression[]
}

export const $sortout: Transform<RawNode, SortoutNode> = (node, ctx, ds) => {
  const children: SortoutNode[] = []
  const dynamics: types.Expression[] = []
  const statics: types.Expression[] = []

  for (const child of node.children) {
    if (types.isJSXElement(child)) {
      children.push($sortout($map(child, ctx, ds), ctx, ds))
    } else if (types.isJSXText(child)) {
      statics.push(types.stringLiteral(child.value))
    } else if (types.isJSXExpressionContainer(child)) {
      const expression = child.expression

      if (types.isArrowFunctionExpression(expression)) {
        dynamics.push(expression)
      } else if (types.isExpression(expression)) {
        statics.push(expression)
      }
    }
  }

  return {
    tag: node.tag,
    properties: node.properties,
    children: children,
    dynamics,
    statics
  }
}