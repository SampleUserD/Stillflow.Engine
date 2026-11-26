import { StillflowContext, StillflowNode, StillflowScope, VMCResult } from "@/stillflow-vite/vm-semantics"
import { BytecodeChunk } from "@/stillflow-vite/vm-semantics/vm.bytecode-builder"

export function compile(node: StillflowNode): VMCResult<typeof node, { context: StillflowContext, code: Uint16Array, chunks: BytecodeChunk[] }, StillflowContext> {
  const context = new StillflowContext(node)

  new StillflowScope([node]).emit(context)

  const built = context.build()

  return {
    ok: true,
    value: {
      context,
      code: built.code,
      chunks: built.chunks
    },
    ctx: context,
    rest: node
  }
}