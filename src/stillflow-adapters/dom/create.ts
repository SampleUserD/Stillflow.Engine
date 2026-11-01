import { Binding } from "../binding.js"
import { Properties } from "./properties.js"

export function create<V, K extends keyof HTMLElementTagNameMap>(name: K, properties?: Properties<V, K>, updates?: (context: V, root: HTMLElementTagNameMap[K]) => void): Binding<HTMLElementTagNameMap[K], V> {
  properties = properties || Object.create(null)

  let { children, props } = properties!

  props = props || {}
  children = children || []

  const style = props.style || {}
  const element = document.createElement(name)

  for (const child of children) {
    element.appendChild(child.create(element))
  }

  const apply_properties = (root: HTMLElementTagNameMap[K]) => {
    for (const property in props) {
      (root as any)[property] = (props as any)[property]
    }
  }

  const apply_styles = (root: HTMLElementTagNameMap[K]) => {
    for (const property in style) {
      (root as any).style[property] = (style as any)[property]
    }
  }

  apply_properties(element)
  apply_styles(element)

  const create = () => {
    const root = element.cloneNode(true) as HTMLElementTagNameMap[K]

    return root
  }

  const update = (context: V, root: HTMLElementTagNameMap[K]) => {
    updates?.(context, root)

    for (let index = 0; index < children.length; index++) {
      children[index].update(context, root.childNodes[index])
    }
  }

  const destroy = (root: HTMLElementTagNameMap[K]) => {
    for (let index = 0; index < children.length; index++) {
      children[index].destroy(root.childNodes[index])
    }
  }

  return {
    create,
    update,
    destroy
  }
}