import { collection } from "../../../index.js"
import { AnyDOM } from "./dom.types.js"

export type Directives<V, K extends keyof HTMLElementTagNameMap = any> = Partial<{
  text: (context: V) => string,
  events: Partial<{ [L in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[L], context: V) => void }>,
  conditional: (context: V) => boolean,
  properties: Partial<{ [L in keyof HTMLElementTagNameMap[K]]: (context: V) => string }>,
  iterate: {
    select: <W>(context: V) => collection.Flushable<W>
    each: () => AnyDOM<any>
  }
}>