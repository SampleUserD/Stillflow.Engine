import { Payload } from "@/stillflow-vite/babel-vm"
import { VMConfigurator } from "@/stillflow-vite/babel-vm/abstract/configurator"
import { types } from "@babel/core"

export function create<Input extends { bytecode: ArrayLike<number> }, Context extends { payload: Payload }>(configurator: VMConfigurator<Context>) {
  return function (input: Input, create_context: (payload: Payload, input: Input) => Context) {
    const payload = new Payload()
    const context = create_context(payload, input)
    const bytecode = input.bytecode

    const body: types.Statement[] = []

    body.push(...configurator.preamble(context))

    let offset = 0

    while (bytecode[offset] !== 0) {
      const size = bytecode[offset]
      const operation = bytecode[offset + 1]

      body.push(...configurator.generators[operation](bytecode, offset, context))

      offset += size
    }

    body.push(...configurator.epilogue(context))

    return {
      payload,
      body
    }
  }
}