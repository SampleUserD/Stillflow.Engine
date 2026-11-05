import { Binding } from "./binding.js"

const EMPTY_STRING = String()

export function jsx<T>(type: (properties: Record<string, any>) => Binding<T>, properties: Record<string, any>, ...children: Binding<any>[]): Binding<T> {
  properties = properties ?? {}

  const dynamic_content: ((context: any) => string)[] = []
  const real_children: Binding<T>[] = []

  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      dynamic_content.push(() => child)
    } else if (child === undefined || child === null) {
      continue
    } else if (typeof child === 'function') {
      dynamic_content.push(child)
    } else if (typeof child === 'object') {
      real_children.push(child)
    } else {
      throw new Error(`JSX does not accept nodes of type '${typeof child}'`)
    }
  }

  if (properties['sf-text'] === undefined && dynamic_content.length > 0) {
    properties['sf-text'] = (context: any) => dynamic_content.map(site => site(context)).join(EMPTY_STRING)
  }

  properties.children = real_children

  return type(properties)
}