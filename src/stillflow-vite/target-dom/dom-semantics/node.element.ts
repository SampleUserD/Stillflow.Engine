import { DOMProperty } from "@/stillflow-vite/target-dom/dom-semantics/node.property"
import { CodesDOM } from "@/stillflow-vite/target-dom/dom.codes"
import { IS_DYNAMIC, StillflowNode } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext, StillflowFor } from "@/stillflow-vite/vm-semantics"

export class DOMElement implements StillflowNode {
  public constructor(private _tag: string, private _properties: Record<string, DOMProperty>, private _children: StillflowNode[]) { }

  public emit(context: StillflowContext): void {
    const id = context.count(this)

    const new_slots = new Array<number>()

    for (const child of this._children) {
      if (!child[IS_DYNAMIC](context)) {
        new_slots.push(context.current_count)
      }

      child.emit(context)
    }

    const properties = context.chunk(() => {
      for (const property of Object.values(this._properties)) {
        property.emit(context)
      }
    })

    const appendages = context.create_chunk(new_slots.flatMap(slot => context.separate(CodesDOM.APPEND, id, slot)))

    context.emit(CodesDOM.CREATE_ELEMENT, this._tag, id, properties, appendages)
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)

    for (const property of Object.values(this._properties)) {
      property.traverse(visitor)
    }

    for (const child of this._children) {
      child.traverse(visitor)
    }
  }

  public get children() {
    return this._children
  }

  public get tag() {
    return this._tag
  }

  public [IS_DYNAMIC](context: StillflowContext) {
    return context.count_suptree(this, node => node[IS_DYNAMIC](context)) > 0
  }
}