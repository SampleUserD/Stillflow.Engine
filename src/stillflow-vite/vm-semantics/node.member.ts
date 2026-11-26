import { RequiredCodes } from "@/stillflow-vite/vm-semantics"
import { StillflowIdentifier } from "@/stillflow-vite/vm-semantics/node.identifier"
import { IS_DYNAMIC, StillflowNode } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext } from "@/stillflow-vite/vm-semantics"

export class StillflowMember implements StillflowNode {
  public constructor(private _object: StillflowMember | StillflowIdentifier, private _property: StillflowIdentifier) { }

  public emit(context: StillflowContext): void {
    const chunk = context.chunk(() => {
      this._object.emit(context)
      this._property.emit(context)
    })

    context.emit(RequiredCodes.READ_MEMBER, chunk)
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)
    visitor(this._object)
    visitor(this._property)
  }

  public get root(): StillflowIdentifier {
    if (this._object instanceof StillflowMember) {
      return this._object.root
    }

    return this._object
  }

  public get object() {
    return this._object
  }

  public get property() {
    return this._property
  }

  public [IS_DYNAMIC]() {
    return false
  }
}