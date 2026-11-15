import { types } from "@babel/core"
import { Directives } from "./dom.directives"

export type Properties<Context, Tag extends keyof HTMLElementTagNameMap> = Partial<{
  name: Tag,
  text: string,
  events: Partial<{
    [L in keyof HTMLElementEventMap]: types.Node
  }>,
  properties: Partial<{
    [L in keyof Omit<HTMLElementTagNameMap[Tag], 'style'>]: HTMLElementTagNameMap[Tag][L]
  }>,
  modifiers: Partial<Directives<Context, Tag>>,
  styles: Partial<{
    [L in keyof HTMLElementTagNameMap[Tag]['style']]: HTMLElementTagNameMap[Tag]['style'][L]
  }>
}>