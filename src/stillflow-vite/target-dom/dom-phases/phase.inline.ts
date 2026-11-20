import { Transform } from "@/stillflow-vite/vm-compiler/vmc.transform"

import { $map } from "@/stillflow-vite/target-dom/dom-phases/phase.raw"
import { $sortout, SortoutNode } from "@/stillflow-vite/target-dom/dom-phases/phase.sortout"
import { replace_properties } from "@/stillflow-vite/vm-jsx-helpers/replace-properties"

import { types } from "@babel/core"

export interface InlinedNode {
  inlined: SortoutNode
}

export const $inline: Transform<SortoutNode, InlinedNode> = (node, ctx, ds) => {
  const component = ctx.context.components.get(node.tag)

  if (component === undefined) {
    return {
      inlined: node
    }
  }

  const parameter = component.parameters[0]?.name

  if (parameter === undefined) {
    return {
      inlined: $sortout($map(component.body, ctx, ds), ctx, ds)
    }
  }

  return {
    inlined: $sortout(
      $map(
        replace_properties(
          types.cloneNode(component.body, true),
          node.properties,
          parameter
        ) as types.JSXElement,
        ctx,
        ds
      ),
      ctx,
      ds
    )
  }
}