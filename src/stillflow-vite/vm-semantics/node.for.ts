import { RequiredCodes } from "@/stillflow-vite/vm-semantics"
import { IS_DYNAMIC, StillflowNode } from "@/stillflow-vite/vm-semantics/vm.node"
import { StillflowContext } from "@/stillflow-vite/vm-semantics"

export class StillflowFor implements StillflowNode {
  public constructor(private _container: StillflowNode, private _select: StillflowNode, private _body: StillflowNode) { }

  public emit(context: StillflowContext): void {
    context.indirect(this, this._container)

    const select = context.chunk(() => this._select.emit(context))

    const old_counter = context.current_count

    const body = context.chunk(() => this._body.emit(context))

    const current_counter = context.current_count

    const sup_count = context.count_suptree(this._body, node => node instanceof StillflowFor)
    const sub_count = context.count_subtree(this._body, node => node instanceof StillflowFor)

    const is_outermost = sup_count <= 0
    const is_innermost = !(is_outermost || sub_count > 1)
    const is_inbetween = !(is_innermost || is_outermost)

    console.log(`flags: `, is_outermost, is_inbetween, is_innermost)

    context.emit(RequiredCodes.FOR, body, select, context.count_of(this._container), Number(is_outermost), Number(is_innermost), Number(is_inbetween), current_counter - old_counter + Number(this._container instanceof StillflowFor === false))
  }

  public traverse(visitor: (node: StillflowNode) => void): void {
    visitor(this)

    this._select.traverse(visitor)
    this._body.traverse(visitor)
  }

  public [IS_DYNAMIC]() {
    return true
  }
}