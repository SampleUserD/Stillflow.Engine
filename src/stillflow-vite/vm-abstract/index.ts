export type {
  VMTarget as Target,
  VMChunk as Chunk,
  VMOpcodeEmitter as Emitter
} from "@/stillflow-vite/vm-abstract/vm.target"

export type {
  VMCompilerResult as Compiled,
  VMTransformerResult as Transformed,
  VMCompilerResultChild as Template,
  VMMarkupResult as Markup
} from "@/stillflow-vite/vm-abstract/vm.results"

export type {
  VMCache as Cache,
  VMCounter as Counter,
  VMCounterFactory as CounterFactory,
  VMRecursion as Recursion,
  VMComponentInformation as Component,
  VMImportInformation as Import,
  VMToolkit as Toolkit
} from "@/stillflow-vite/vm-abstract/vm.toolkit"

export type { VMBinding as Binding } from '@/stillflow-vite/vm-abstract/vm.binding'
export type { VMStillflowOptions as Options } from "@/stillflow-vite/vm-abstract/vm.options"

export { pack_opcode, unpack_local, unpack_target } from "@/stillflow-vite/vm-abstract/vm.instruction"