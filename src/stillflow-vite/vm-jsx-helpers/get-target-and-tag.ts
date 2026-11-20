import { get_full_name } from "@/stillflow-vite/vm-jsx-helpers/get-full-name"
import { types } from "@babel/core"

export function get_target_and_tag(node: types.JSXElement): [string, string] {
  const name = node.openingElement.name
  const full_name = get_full_name(name)
  const splitted_name = full_name.split('.')

  const target = splitted_name.slice(0, -2).join(String())
  const tag = splitted_name[splitted_name.length - 1]

  return [target, tag]
}