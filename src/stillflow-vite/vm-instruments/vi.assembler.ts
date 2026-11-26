import type { types } from '@babel/core'
import * as vm from '@/stillflow-vite/vm-abstract'

export class Assembler<T> {
  public constructor(private _targets: vm.Options['targets'], private _toolkit: vm.Toolkit, private _context: T) { }

  public assemble(bytecode: ArrayLike<number>): vm.Chunk {
    const module_statements: types.Statement[] = []
    const body_statements: types.Statement[] = []

    let offset = 0

    const toolkit = {
      toolkit: this._toolkit,
      assembler: this
    }

    while (bytecode[offset] !== undefined) {
      const size = bytecode[offset]
      const opcode = bytecode[offset + 1]

      const target = vm.unpack_target(opcode)
      const local = vm.unpack_local(opcode)

      const vm_target = this._targets[target]

      if (local in vm_target.emitters === false) {
        throw new Error(`There is not opcode ${local} in ${target} target`)
      }

      const chunk = vm_target.emitters[local](bytecode, offset, this._context, toolkit)

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