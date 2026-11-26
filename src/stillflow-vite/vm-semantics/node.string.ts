import { StillflowContext, StillflowNode } from "@/stillflow-vite/vm-semantics"
import { IS_DYNAMIC } from "@/stillflow-vite/vm-semantics/vm.node"

export class StillflowString implements StillflowNode {
  public constructor(private _value: string) { }

  public emit(context: StillflowContext): void {
    context.embed([this._value])
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)
  }

  public get value() {
    return this._value
  }

  public [IS_DYNAMIC]() {
    return false
  }
}