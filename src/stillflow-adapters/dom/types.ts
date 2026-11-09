import { Binding } from "../binding.js"
import { Properties } from "./properties/properties.js"

export type DOM<V, K extends keyof HTMLElementTagNameMap> = Binding<Properties<V, K>>

export type AnyDOM<V> = Binding<Properties<V, keyof HTMLElementTagNameMap>>