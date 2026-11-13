import { VMConfig } from "./abstract/config.js"
import { Payload } from "./payload.js"

export function vm_create<Input, Context extends { payload: Payload }>(config: VMConfig<Context>) {
  return function compile(bytecode: ArrayLike<number>, input: Input, create_context: (payload: Payload, input: Input) => Context) {
    const payload = new Payload()
    const context = create_context(payload, input)

    let code = config.preamble(context)
    let offset = 0

    while (bytecode[offset] !== 0) {
      const size = bytecode[offset]
      const operation = bytecode[offset + 1]

      code += config.generators[operation](bytecode, offset, context)
      offset += size
    }

    code += config.epilogue(context)

    return new Function(...payload.parameters, code)(...payload.values)
  }
}