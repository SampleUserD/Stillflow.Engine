import { Meta } from "./meta.js"
import { Backref, Link, Local, Ref } from "./operators.js"

type Mapping = Record<string, any>

type OperatorView<V extends Mapping, T extends Mapping, K extends keyof V> =
  V[K] extends Ref<T, infer K0> ? T[K0] :
  V[K] extends Backref<T, infer K1> ? T[K1] :
  V[K] extends Local<infer K2> ? K2 :
  V[K] extends Link<infer K3> ? View<K3, T> :
  any

export type View<V extends Mapping, T extends Mapping> = Meta & {
  [K in keyof V]: OperatorView<V, T, K>
}