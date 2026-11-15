import { types } from "@babel/core"

export type VMGenerator<Context> = (bytecode: ArrayLike<number>, offset: number, context: Context) => types.Statement[]