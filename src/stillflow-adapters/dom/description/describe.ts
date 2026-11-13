import { AnyDOM } from "../vm/dom.types.js"
import { Properties } from "../properties/properties.js"

export function describe<V, K extends keyof HTMLElementTagNameMap>(properties: Properties<V, K>, children: AnyDOM<V>[]): AnyDOM<V> {
  return {
    children,
    properties
  }
}