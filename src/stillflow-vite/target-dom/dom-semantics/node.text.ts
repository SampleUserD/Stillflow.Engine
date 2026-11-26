import { CodesDOM } from "@/stillflow-vite/target-dom/dom.codes"
import { IS_DYNAMIC } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext, StillflowNode } from "@/stillflow-vite/vm-semantics"

export class DOMDynamicText implements StillflowNode {
  public constructor(private _value: StillflowNode) { }

  public emit(context: StillflowContext): void {
    const id = context.count(this)

    const chunk = context.chunk(() => this._value.emit(context))

    context.emit(CodesDOM.SET_DYNAMIC_TEXT, chunk, id)
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)
  }

  public [IS_DYNAMIC]() {
    return true
  }
}

export class DOMStaticText implements StillflowNode {
  public constructor(private _value: string) { }

  public emit(context: StillflowContext): void {
    if (!this._value) {
      return
    }

    const id = context.count(this)

    context.emit(CodesDOM.SET_STATIC_TEXT, this._value, id)
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)
  }

  public [IS_DYNAMIC]() {
    return !this._value
  }
}