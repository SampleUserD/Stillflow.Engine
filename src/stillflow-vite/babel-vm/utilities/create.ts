import { Payload } from "@/stillflow-vite/babel-vm"
import { VMConfigurator } from "@/stillflow-vite/babel-vm/abstract/configurator"
import { types } from "@babel/core"

export function create<Input extends { bytecode: ArrayLike<number> }, Context extends { payload: Payload }>(configurator: VMConfigurator<Context>) {
  return function (input: Input, create_context: (payload: Payload, input: Input, configurator: VMConfigurator<Context>) => Context) {
    const payload = new Payload()
    const context = create_context(payload, input, configurator)
    const bytecode = input.bytecode

    const body: types.Statement[] = []
    const outer: types.Statement[] = []

    body.push(...configurator.preamble(context))

    let offset = 0

    while (bytecode[offset] !== 0) {
      const size = bytecode[offset]
      const operation = bytecode[offset + 1]

      const token = configurator.generators[operation](bytecode, offset, context)

      body.push(...token.body)
      outer.push(...token.outer)

      offset += size
    }

    body.push(...configurator.epilogue(context))

    return {
      payload,
      outer,
      body
    }
  }
}