import { Binding } from "../binding.js"
import { Properties } from "./properties.js"

export function create<V, K extends keyof HTMLElementTagNameMap>(name: K, properties?: Properties<V, K>, updates?: (context: V, root: HTMLElementTagNameMap[K]) => void): Binding<HTMLElementTagNameMap[K], V> {
  properties = properties || Object.create(null)

  let { events, children, props } = properties

  props = props || Object.create(null)
  events = events || Object.create(null)
  children = children || []

  const style = props.style || Object.create(null)
  const element = document.createElement(name)

  for (const child of children) {
    element.appendChild(child.create())
  }

  const apply_properties = (root: HTMLElementTagNameMap[K]) => {
    for (const property in props) {
      root[property] = props[property]
    }
  }

  const apply_styles = (root: HTMLElementTagNameMap[K]) => {
    for (const property in style) {
      root.style[property] = style[property]
    }
  }

  const apply_events = (root: HTMLElementTagNameMap[K]) => {
    for (const event in events) {
      root.addEventListener(event, events[event])
    }
  }

  apply_properties(element)
  apply_styles(element)

  const create = () => {
    const root = element.cloneNode(true) as HTMLElementTagNameMap[K]

    apply_events(root)

    return root
  }

  const update = (context: V, root: HTMLElementTagNameMap[K]) => {
    updates?.(context, root)

    for (let index = 0; index < children.length; index++) {
      children[index].update(context, root.childNodes[index])
    }
  }

  const destroy = () => {
    for (const child of children) {
      child.destroy()
    }
  }

  return {
    create,
    update,
    destroy
  }
}