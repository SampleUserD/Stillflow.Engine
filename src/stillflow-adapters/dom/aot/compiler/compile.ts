import { AnyDOM } from "../dom.types.js"
import { Directives } from "../dom.directives.js"
import { SF_CACHE, SF_CACHE_TEXT } from "../dom.symbols.js"

type Instructions<V> = Partial<{ [L in keyof Directives<V>]: Directives<V>[L] }> & { id: number }

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

function compile_template<V>(node: AnyDOM<V>, state: { instructions: Instructions<V>[], id: number }) {
  const modifiers = node.properties.modifiers || {}

  const has_modifiers =
    modifiers.text !== undefined ||
    modifiers.properties !== undefined ||
    modifiers.events !== undefined ||
    modifiers.iterate !== undefined ||
    modifiers.conditional !== undefined

  if (has_modifiers) {
    const current_id = state.id++

    const instruction: Instructions<V> = { id: current_id }

    if (modifiers.text !== undefined) {
      instruction.text = modifiers.text
    }

    if (modifiers.properties !== undefined) {
      instruction.properties = modifiers.properties
    }

    if (modifiers.events !== undefined) {
      instruction.events = modifiers.events
    }

    if (modifiers.iterate !== undefined) {
      instruction.iterate = modifiers.iterate
    }

    if (modifiers.conditional !== undefined) {
      instruction.conditional = modifiers.conditional
    }

    state.instructions.push(instruction)
  }

  for (let index = 0; index < node.children.length; index++) {
    compile_template(node.children[index], state)
  }
}

function compile<V>(node: AnyDOM<V>): Instructions<V>[] {
  const state = {
    instructions: [] as Instructions<V>[],
    id: 0
  }

  compile_template(node, state)

  return state.instructions
}

export { compile, markup_template }
export { Instructions }