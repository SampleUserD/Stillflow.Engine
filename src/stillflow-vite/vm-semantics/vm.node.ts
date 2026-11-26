import { StillflowContext } from "@/stillflow-vite/vm-semantics/vm.context"

export const IS_DYNAMIC: unique symbol = Symbol("sf_is_dynamic")

export type StillflowBytecode = number[]

export interface StillflowNode {
  [IS_DYNAMIC](context: StillflowContext): boolean

  emit(context: StillflowContext): void

  traverse(visitor: (node: StillflowNode) => void): void
}
