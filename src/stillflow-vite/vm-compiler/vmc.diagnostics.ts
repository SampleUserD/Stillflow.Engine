import { types } from "@babel/core"

export type Diagnostics = {
  row: number,
  column: number,
  error: Error
  node: types.Node
}