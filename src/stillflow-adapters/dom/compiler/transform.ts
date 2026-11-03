import { DOM } from "../dom.js"

function apply_text<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>, root: HTMLElementTagNameMap[K]) {
  const text = description.properties.text || String()

  if (root.firstChild === null || root.firstChild.nodeType !== Node.TEXT_NODE) {
    root.insertBefore(document.createTextNode(text), null)
    return
  }

  root.firstChild.nodeValue = text
}

function apply_properties<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>, root: HTMLElementTagNameMap[K]) {
  let { properties } = description.properties

  properties = properties || {}

  for (const key in properties) {
    (root as any)[key] = (properties as any)[key]
  }
}

function apply_styles<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>, root: HTMLElementTagNameMap[K]) {
  let { styles } = description.properties

  styles = styles || {}

  for (const key in styles) {
    (root.style as any)[key] = (styles as any)[key]
  }
}

function apply_events<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>, root: HTMLElementTagNameMap[K]) {
  let { events } = description.properties

  events = events || {}

  for (const key in events) {
    root.addEventListener(key, (events as any)[key])
  }
}

export function transform<V, K extends keyof HTMLElementTagNameMap>(description: DOM<V, K>): HTMLElementTagNameMap[K] {
  let { name } = description.properties

  const root = document.createElement(name as K)

  apply_properties(description, root)
  apply_styles(description, root)
  apply_events(description, root)
  apply_text(description, root)

  for (const child of description.children) {
    root.appendChild(transform(child))
  }

  return root
}