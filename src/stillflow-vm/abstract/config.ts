import { VMGenerator } from "./generator.js"

export type VMConfig<Context> = {
  generators: Record<number, VMGenerator<Context>>,
  preamble: (context: Context) => string,
  epilogue: (context: Context) => string
}