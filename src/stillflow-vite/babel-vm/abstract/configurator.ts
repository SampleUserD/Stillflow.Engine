import { types } from "@babel/core"
import type { VMGenerator } from "./generator.js"

export type VMConfigurator<Context> = {
  context: {
    counters: Record<string, number>
  },
  generators: Record<number, VMGenerator<Context>>,
  preamble: (context: Context) => types.Statement[],
  epilogue: (context: Context) => types.Statement[]
}