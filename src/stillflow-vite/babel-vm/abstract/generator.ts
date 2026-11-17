import { types } from "@babel/core"

export type VMGenerator<Context> = (bytecode: ArrayLike<number>, offset: number, context: Context) => {
  body: types.Statement[],
  outer: types.Statement[]
}