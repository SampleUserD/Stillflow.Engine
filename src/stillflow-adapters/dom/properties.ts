import { Binding } from "../binding.js"

type PropertiesWithoutStyles<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>>

type Styles<K extends keyof HTMLElementTagNameMap> = Partial<{ style: Partial<HTMLElementTagNameMap[K]['style']> }>

type Events = Partial<{ [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void }>

export type Properties<V, K extends keyof HTMLElementTagNameMap> = Partial<{
  props: PropertiesWithoutStyles<K> & Styles<K>,
  events: Events,
  children: Binding<any, V>[]
}>