import { CodesDOM } from "@/stillflow-vite/target-dom/dom.codes"
import { StillflowNode, StillflowString, StillflowContext } from "@/stillflow-vite/vm-semantics"
import { IS_DYNAMIC } from "@/stillflow-vite/vm-semantics/vm.node"

export interface DOMProperty extends StillflowNode {
  get name(): string

  get value(): StillflowNode
}

export class DOMStaticProperty implements DOMProperty {
  public constructor(private _code: CodesDOM.SET_ATTRIBUTE | CodesDOM.SET_STATIC_EVENT, private _name: string, private _value: StillflowString) { }

  public emit(context: StillflowContext): void {
    context.count(this)

    context.emit(this._code, this.name, this._value.value)
  }

  public [IS_DYNAMIC]() {
    return false
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)

    this._value.traverse(visitor)
  }

  public get name() {
    return this._name
  }

  public get value() {
    return this._value
  }
}

export class DOMDynamicProperty implements DOMProperty {
  public constructor(private _code: CodesDOM.SET_LIST_EVENT | CodesDOM.SET_PROPERTY, private _name: string, private _value: StillflowNode) { }

  public emit(context: StillflowContext): void {
    context.count(this)

    const chunk = context.chunk(() => this._value.emit(context))

    context.emit(this._code, this._name, chunk)
  }

  public [IS_DYNAMIC]() {
    return true
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)

    this._value.traverse(visitor)
  }

  public get name() {
    return this._name
  }

  public get value() {
    return this._value
  }
}