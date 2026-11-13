import { Binding } from "./stillflow-vm/binding.js"

export function jsx<T>(type: (properties: Record<string, any>, children: Binding<any>[]) => Binding<T>, properties: Record<string, any>, ...children: Binding<any>[]): Binding<T> {
  return type(properties, children)
}