export type {
  VMTarget as Target,
  VMChunk as Chunk,
  VMOpcodeEmitter as Emitter,
  VMEmitterToolkit as EmitterToolkit
} from "@/stillflow-vite/vm-abstract/vm.target"

export type {
  VMCache as Cache,
  VMCounter as Counter,
  VMCounterFactory as CounterFactory,
  VMComponentInformation as Component,
  VMImportInformation as Import,
  VMToolkit as Toolkit
} from "@/stillflow-vite/vm-abstract/vm.toolkit"

export type { VMStillflowOptions as Options } from "@/stillflow-vite/vm-abstract/vm.options"

export { pack_opcode, unpack_local, unpack_target } from "@/stillflow-vite/vm-abstract/vm.instruction"