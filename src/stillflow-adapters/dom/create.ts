import { Binding } from "../binding.js"

type Properties<V, K extends keyof HTMLElementTagNameMap> = HTMLElementTagNameMap[K] & {
  events: HTMLElementEventMap,
  children: Binding<HTMLElement, V>[]
}

export function create<V, K extends keyof HTMLElementTagNameMap>(name: K, properties: Properties<V, K>) {
  return
}