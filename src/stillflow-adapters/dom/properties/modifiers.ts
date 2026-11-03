import { Collection } from "../../../index.js"
import { AnyDOM } from "../dom.js"

export type Modifiers<Context> = Partial<{
  text: (context: Context) => string,
  lens: <Another>(context: Context) => Another,
  events: Partial<{ [L in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[L], context: Context) => void }>,
  iterate: {
    select: <V>(context: Context) => Collection<V>
    each: () => AnyDOM<any>
  }
}>