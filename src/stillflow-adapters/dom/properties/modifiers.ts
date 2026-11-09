import { FlushableCollection } from "../../../index.js"
import { AnyDOM } from "../types.js"

export type Modifiers<Context, K extends keyof HTMLElementTagNameMap = any> = Partial<{
  text: (context: Context) => string,
  lens: <Another>(context: Context) => Another,
  conditional: (context: Context) => boolean,
  events: Partial<{ [L in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[L], context: Context) => void }>,
  properties: Partial<{ [L in keyof HTMLElementTagNameMap[K]]: (context: Context) => string }>,
  iterate: {
    select: <V>(context: Context) => FlushableCollection<V>
    each: () => AnyDOM<any>
  }
}>