export type TargetId = number
export type LocalOpcode = number
export type PackedOpcode = number

export const CORE_TARGET_ID: TargetId = 0

const OPCODE_MASK = 0x00ffffff

export const pack_opcode = (target: TargetId, local: LocalOpcode): PackedOpcode => ((target & 0xff) << 24) | (local & OPCODE_MASK)

export const unpack_target = (pack: PackedOpcode): TargetId => pack >>> 24

export const unpack_local = (pack: PackedOpcode): LocalOpcode => pack & OPCODE_MASK