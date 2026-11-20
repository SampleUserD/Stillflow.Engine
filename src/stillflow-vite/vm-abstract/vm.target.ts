import { LocalOpcode } from "@/stillflow-vite/vm-abstract/vm.instruction"
import { VMCompilerResult } from "@/stillflow-vite/vm-abstract/vm.results"
import type { VMToolkit } from "@/stillflow-vite/vm-abstract/vm.toolkit"
import type { types } from "@babel/core"

export interface VMChunk {
  module: types.Statement[],
  body: types.Statement[]
}

export type VMOpcodeEmitter = (bytecode: ArrayLike<number>, offset: number, toolkit: VMToolkit, context: VMCompilerResult) => VMChunk

export interface VMTarget {
  emitters: Readonly<Record<LocalOpcode, VMOpcodeEmitter>>

  main(descriptor: types.JSXElement, toolkit: VMToolkit, others: Record<number, VMTarget>): VMChunk
}