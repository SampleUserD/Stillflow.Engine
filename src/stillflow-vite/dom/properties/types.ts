import { Binding } from "@/stillflow-vite/babel-vm/index"
import { Properties } from "./properties"

export type DOM<V, K extends keyof HTMLElementTagNameMap> = Binding<Properties<V, K>>

export type AnyDOM<V> = Binding<Properties<V, keyof HTMLElementTagNameMap>>