import { DOM } from "../dom.types.js"

function transform_code<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>, payloads: any[], depth: number = 1): string {
  let { name, text, properties, styles, events, modifiers } = description.properties
  let code = String()

  styles = styles || Object.create(null)
  events = events || Object.create(null)
  properties = properties || Object.create(null)

  const nameIndex = payloads.length

  payloads.push(name)

  code += `let sf_child_node_${depth} = document.createElement(p${nameIndex});`

  if (text !== undefined || modifiers?.text !== undefined) {
    const textIndex = payloads.length

    payloads.push(text)

    code += `let sf_text_node_${depth} = document.createTextNode(p${textIndex});`
    code += `sf_child_node_${depth}.appendChild(sf_text_node_${depth});`
  }

  code += `sf_child_node_${depth - 1}.appendChild(sf_child_node_${depth});`

  for (const key in styles) {
    const keyIndex = payloads.length

    payloads.push(key)

    const styleIndex = payloads.length

    payloads.push((styles as any)[key])

    code += `sf_child_node_${depth}.style[p${keyIndex}] = p${styleIndex};`
  }

  for (const key in events) {
    const pIndex = payloads.length
    const event = (events as any)[key]

    payloads.push(event)

    code += `sf_child_node_${depth}.addEventListener("${key}", p${pIndex});`
  }

  for (const key in properties) {
    const keyIndex = payloads.length

    payloads.push(key)

    const propertyIndex = payloads.length
    const property = (properties as any)[key]

    payloads.push(property)

    code += `sf_child_node_${depth}[p${keyIndex}] = p${propertyIndex};`
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