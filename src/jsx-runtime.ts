import { Binding } from "./stillflow-vm/binding.js"

export function jsx<T>(type: (properties: Record<string, any>, children: Binding<any>[]) => Binding<T>, properties: Record<string, any>): Binding<T> {
  const children = properties.children || []

  return type(properties, children)
}

export function jsxs<T>(type: (properties: Record<string, any>, children: Binding<any>[]) => Binding<T>, properties: Record<string, any>): Binding<T> {
  return jsx(type, properties)
}