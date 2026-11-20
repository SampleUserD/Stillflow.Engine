import { Transform } from "@/stillflow-vite/vm-compiler/vmc.transform"
import { extract_attributes } from "@/stillflow-vite/vm-jsx-helpers/extract-buildtime"
import { get_full_name } from "@/stillflow-vite/vm-jsx-helpers/get-full-name"

import { types } from "@babel/core"

export interface RawNode {
  tag: string,
  properties: Record<string, types.Node>,
  children: types.JSXElement['children'],
}

export const $map: Transform<types.JSXElement, RawNode> = (description: types.JSXElement) => {
  return {
    tag: get_full_name(description.openingElement.name),
    properties: extract_attributes(description),
    children: description.children
  }
}