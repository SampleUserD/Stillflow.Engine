import { AnyDOM } from '@/stillflow-adapters/dom/dom.types'
import * as collection from '@collection/index'

export type Directives<Context, K extends keyof HTMLElementTagNameMap> = {
  vm: () => any,
  text: (context: Context) => string,
  events: Partial<{ [L in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[L], context: Context) => void }>,
  conditional: (context: Context) => boolean,
  properties: Partial<{ [L in keyof HTMLElementTagNameMap[K]]: (context: Context) => HTMLElementTagNameMap[K][L] }>,
  iterate: {
    select: (context: Context) => collection.Flushable<unknown>
    each: () => AnyDOM<Context>
  }
}