import { RequiredCodes } from "@/stillflow-vite/vm-semantics/node.codes"
import { IS_DYNAMIC, StillflowNode } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext } from "@/stillflow-vite/vm-semantics"

export class StillflowIdentifier implements StillflowNode {
  public constructor(private _name: string) { }

  public emit(context: StillflowContext): void {
    context.emit(RequiredCodes.READ_ID, this._name)
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)
  }

  public is(identifier: string) {
    return this._name === identifier
  }

  public get root() {
    return this
  }

  public get name() {
    return this._name
  }

  public [IS_DYNAMIC]() {
    return false
  }
}