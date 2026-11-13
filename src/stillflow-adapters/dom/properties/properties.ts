import { Directives } from "../vm/dom.directives.js"

export type Properties<Context, Tag extends keyof HTMLElementTagNameMap> = Partial<{
  name: Tag,
  text: string,
  events: Partial<{
    [L in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[L], context: Context) => void
  }>,
  properties: Partial<{
    [L in keyof Omit<HTMLElementTagNameMap[Tag], 'style'>]: HTMLElementTagNameMap[Tag][L]
  }>,
  modifiers: Partial<Directives<Context, Tag>>,
  styles: Partial<{
    [L in keyof HTMLElementTagNameMap[Tag]['style']]: HTMLElementTagNameMap[Tag]['style'][L]
  }>
}>