import { RequiredCodes } from "@/stillflow-vite/vm-semantics/node.codes"
import { StillflowSequence } from "@/stillflow-vite/vm-semantics/node.sequence"
import { IS_DYNAMIC, StillflowNode } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext } from "@/stillflow-vite/vm-semantics"

export class StillflowScope implements StillflowNode {
  public constructor(private _nodes: StillflowNode[]) { }

  public emit(context: StillflowContext): void {
    const chunk = context.chunk(() => new StillflowSequence(this._nodes).emit(context))

    context.emit(RequiredCodes.SCOPE, chunk)
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)

    for (const child of this._nodes) {
      child.traverse(visitor)
    }
  }

  public [IS_DYNAMIC]() {
    return false
  }
}