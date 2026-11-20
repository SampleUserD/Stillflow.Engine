import type { Binding } from "@/stillflow-vite/vm-abstract"
import type { types } from "@babel/core"

export type DirectivesDOM = Partial<{
  delegate: Record<string, types.Expression>,
  properties: Record<string, types.Expression>,
  iterator: {
    select: types.Expression,
    each: types.Expression
  },
  conditional: types.Expression,
  dynamic_text: types.Expression
}>

export type PropertiesDOM = Partial<{
  tag: string,
  text: types.Expression,
  styles: Record<string, string>,
  events: Record<string, types.Expression>,
  directives: DirectivesDOM,
  properties: Record<string, string>,
  recursive: BindingDOM
}>

export type BindingDOM = Binding<PropertiesDOM>