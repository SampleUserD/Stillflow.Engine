import { VMGenerated } from '@/stillflow-aot/vm/vm.generated'
import { VMConfig } from '@/stillflow-aot/vm/vm.config'
import { types } from '@babel/core'
import * as vm from '@vm/index'

export function vm_create<Input, Context extends { payload: vm.Payload }>(
  config: VMConfig<Context>
) {
  return function compile(
    bytecode: ArrayLike<number>,
    input: Input,
    create_context: (payload: vm.Payload, input: Input) => Context,
    resolve: (node: types.Node) => any
  ): VMGenerated {
    const payload = new vm.Payload()
    const context = create_context(payload, input)

    const body: types.Statement[] = []
    body.push(...config.preamble(context))

    let offset = 0

    while (bytecode[offset] !== 0) {
      const size = bytecode[offset]
      const operation = bytecode[offset + 1]

      body.push(...config.generators[operation](bytecode, offset, context))

      offset += size
    }

    body.push(...config.epilogue(context))

    return {
      parameters: payload.parameters.map(name => types.identifier(name)),
      values: payload.values.map(resolve),
      body
    }
  }
}