import type { Scope, types } from "@babel/core"

export type Component = {
  node: types.Node,
  parameters: types.Identifier[],
  body: types.JSXElement,
  filename: string,
  scope: Scope
}

export type Import = {
  source: string,
  imported_name: string,
  is_default: boolean
}

export interface VMChunk {
  module: types.Statement[],
  body: types.Statement[]
}

export interface VMTarget {
  main(descriptor: types.JSXElement, components: Map<string, Component>): VMChunk
}