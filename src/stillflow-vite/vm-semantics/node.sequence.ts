import { IS_DYNAMIC, StillflowNode } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext } from "@/stillflow-vite/vm-semantics"

export class StillflowSequence implements StillflowNode {
  public constructor(private _nodes: StillflowNode[]) { }

  public emit(context: StillflowContext): void {
    for (const node of this._nodes) {
      node.emit(context)
    }
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)

    for (const node of this._nodes) {
      node.traverse(visitor)
    }
  }

  public [IS_DYNAMIC]() {
    return false
  }
}