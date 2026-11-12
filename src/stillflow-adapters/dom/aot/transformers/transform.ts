import { DOM } from "../dom.types.js"

function transform_code<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>, payloads: any[], depth: number = 1): string {
  let { name, text, properties, styles, events, modifiers } = description.properties
  let code = String()

  styles = styles || Object.create(null)
  events = events || Object.create(null)
  properties = properties || Object.create(null)

  code += `let sf_child_node_${depth} = document.createElement("${name}");`

  if (text !== undefined || modifiers?.text !== undefined) {
    code += `let sf_text_node_${depth} = document.createTextNode("${text}");`
    code += `sf_child_node_${depth}.appendChild(sf_text_node_${depth});`
  }

  code += `sf_child_node_${depth - 1}.appendChild(sf_child_node_${depth});`

  for (const key in styles) {
    code += `sf_child_node_${depth}.style.${key} = "${(styles as any)[key]}";`
  }

  for (const key in events) {
    const pIndex = payloads.length
    const event = (events as any)[key]

    payloads.push(event)

    code += `sf_child_node_${depth}.addEventListener("${key}", p${pIndex});`
  }

  for (const key in properties) {
    const property = (properties as any)[key]

    code += `sf_child_node_${depth}.${key} = "${property}";`
  }

  for (const child of description.children) {
    code += `{${transform_code(child, payloads, depth + 1)}}`
  }

  return code
}

function transform<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>): HTMLElementTagNameMap[K] {
  const payloads: any[] = []
  const fragment = document.createDocumentFragment()

  let code = String()

  code += `let sf_child_node_0 = root;`
  code += transform_code(description, payloads)
  code += `return sf_child_node_1; `

  const transformer = new Function(...payloads.map((_, id) => `p${id} `), 'root', code)
  const root = transformer(...payloads, fragment)

  return root
}

export { transform }