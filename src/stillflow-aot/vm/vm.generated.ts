import { types } from '@babel/core'

export interface VMGenerated {
  parameters: types.Identifier[],
  values: types.Node[],
  body: types.Statement[]
}