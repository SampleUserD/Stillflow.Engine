import { types } from "@babel/core"

export interface VMMarkupResult {
  parameters: types.Identifier[],
  body: types.Statement[]
}

export interface VMTransformerResult {
  body: types.Statement[],
  module: types.Statement[],
  parameters: types.Identifier[],
  return_expression: types.Expression
}

export interface VMCompilerResultChild {
  root: VMTransformerResult,
  markup: VMMarkupResult,
  bytecode: ArrayLike<number>,
  strings: string[],
  functions: types.Expression[],
  templates: VMCompilerResultChild[],
}

export interface VMCompilerResult extends VMCompilerResultChild {
  compile_map: Map<VMCompilerResultChild, number>
  transform_map: Map<VMTransformerResult, number>
}
