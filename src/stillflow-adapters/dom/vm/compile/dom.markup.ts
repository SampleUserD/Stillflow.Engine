import { SF_CACHE, SF_CACHE_TEXT } from "../dom.symbols.js"
import { AnyDOM } from '../dom.types'

function markup_template_code<V>(node: AnyDOM<V>, path: number[]): string {
  let { modifiers } = node.properties

  let code = String()

  const has_modifiers =
    modifiers?.text !== undefined ||
    modifiers?.properties !== undefined ||
    modifiers?.events !== undefined ||
    modifiers?.iterate !== undefined ||
    modifiers?.conditional !== undefined

  if (has_modifiers) {
    code += `sf_markup_path.push(root${path.map(x => `.children[${x}]`).join(String())});`
  }

  for (let index = 0; index < node.children.length; index++) {
    code += markup_template_code(node.children[index], [...path, index])
  }

  return code
}

function markup_template<V>(node: AnyDOM<V>): (root: HTMLElement) => void {
  let code = String()

  code += `return function(root) {`
  code += `if (root.${SF_CACHE}) {`
  code += `return;`
  code += `}`
  code += `let sf_markup_path = [];`
  code += markup_template_code(node, [])
  code += `root.${SF_CACHE} = sf_markup_path;`
  code += `root.${SF_CACHE_TEXT} = sf_markup_path.map(node => node.firstChild);`
  code += `}`

  const generator = new Function(code)

  return generator()
}

export { markup_template }