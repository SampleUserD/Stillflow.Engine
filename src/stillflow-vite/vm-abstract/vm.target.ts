import { LocalOpcode } from "@/stillflow-vite/vm-abstract/vm.instruction"
import type { VMToolkit } from "@/stillflow-vite/vm-abstract/vm.toolkit"
import type { Assembler } from "@/stillflow-vite/vm-instruments"
import type { types } from "@babel/core"

export interface VMChunk {
  module: types.Statement[],
  body: types.Statement[],
}

export interface VMEmitterToolkit<T> {
  toolkit: VMToolkit,
  assembler: Assembler<T>
}

export type VMOpcodeEmitter<T> = (bytecode: ArrayLike<number>, offset: number, context: T, toolkit: VMEmitterToolkit<T>) => VMChunk

export interface VMTarget<T = unknown> {
  emitters: Readonly<Record<LocalOpcode, VMOpcodeEmitter<T>>>

  main(descriptor: types.JSXElement, toolkit: VMToolkit, others: Record<number, VMTarget>): VMChunk
}