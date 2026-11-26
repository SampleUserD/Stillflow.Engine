export type {
  VMTarget as Target,
  VMChunk as Chunk,
} from "@/stillflow-vite/vm-abstract/vm.target"

export type { VMStillflowOptions as Options } from "@/stillflow-vite/vm-abstract/vm.options"

export { pack_opcode, unpack_local, unpack_target } from "@/stillflow-vite/vm-abstract/vm.instruction"