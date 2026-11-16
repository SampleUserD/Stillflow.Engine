import { types } from '@babel/core'

export type Directives<V, K extends keyof HTMLElementTagNameMap = any> = Partial<{
  vm: types.Node,
  text: types.Node,
  events: Partial<{ [L in keyof HTMLElementEventMap]: types.Node }>,
  conditional: types.Node,
  properties: Partial<{ [L in keyof HTMLElementTagNameMap[K]]: types.Node }>,
  iterate: {
    select: types.Node
    each: types.Node
  }
}>