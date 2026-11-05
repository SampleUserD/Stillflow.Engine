import { Binding } from "./binding.js"

const EMPTY_STRING = String()

export function jsx<T>(type: (properties: Record<string, any>) => Binding<T>, properties: Record<string, any>, ...children: Binding<any>[]): Binding<T> {
  properties = properties ?? {}
  properties.children = children

  return type(properties)
}