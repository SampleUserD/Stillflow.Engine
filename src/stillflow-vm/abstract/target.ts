import { Binding } from "../binding.js"

export interface VMTarget<Root = any, Context = any> {
  root: Root

  applier: (root: Root, context: Context) => void

  dispose?: (root: Root) => void
}

export type VMCompiler<Properties extends Record<string, any> = Record<string, any>, Root = any> = (node: Binding<Properties>) => VMTarget<Root>