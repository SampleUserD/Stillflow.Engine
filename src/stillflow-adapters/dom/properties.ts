import { Binding } from "../binding.js"

type PropertiesWithoutStyles<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>>

type Styles<K extends keyof HTMLElementTagNameMap> = Partial<{ style: Partial<HTMLElementTagNameMap[K]['style']> }>

export type Properties<V, K extends keyof HTMLElementTagNameMap> = Partial<{
  props: PropertiesWithoutStyles<K> & Styles<K>,
  children: Binding<any, V>[]
}>