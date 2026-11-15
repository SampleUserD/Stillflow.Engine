import { types } from "@babel/core"
import { VMGenerator } from "./vm.generator.js"

export type VMConfig<Context> = {
  generators: Record<number, VMGenerator<Context>>,
  preamble: (context: Context) => types.Statement[],
  epilogue: (context: Context) => types.Statement[]
}