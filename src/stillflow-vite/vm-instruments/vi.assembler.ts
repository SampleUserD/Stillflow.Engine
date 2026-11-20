import type { types } from '@babel/core'
import * as vm from '@/stillflow-vite/vm-abstract'

export class Assembler {
  public constructor(private _targets: vm.Options['targets'], private _toolkit: vm.Toolkit, private _context: vm.Compiled) { }

  public assemble(bytecode: ArrayLike<number>): vm.Chunk {
    const END = 0

    const module_statements: types.Statement[] = []
    const body_statements: types.Statement[] = []

    let offset = 0

    while (bytecode[offset] !== END) {
      const size = bytecode[offset]
      const opcode = bytecode[offset + 1]

      const target = vm.unpack_target(opcode)
      const local = vm.unpack_local(opcode)

      const vm_target = this._targets[target]

      const chunk = vm_target.emitters[local](bytecode, offset, this._toolkit, this._context)

      module_statements.push(...chunk.module)
      body_statements.push(...chunk.body)

      offset += size
    }

    return {
      module: module_statements,
      body: body_statements
    }
  }
} 