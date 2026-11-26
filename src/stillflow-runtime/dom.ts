import * as collection from "@/stillflow-collection/index.js"

const DYNAMIC_PROPERTY_PREFIX = `sf:` as const
const DELEGATE_EVENT_PROPERTY_PREFIX = `${DYNAMIC_PROPERTY_PREFIX}on-` as const
const COMMON_EVENT_PROPERTY_PREFIX = `on:` as const
const COMMON_STYLES_PROPERTY = 'style:'

type ElementStyles<K extends keyof HTMLElementTagNameMap> = { children: any } & {
  [L in keyof (HTMLElementTagNameMap[K]['style']) & string as `${typeof COMMON_STYLES_PROPERTY}${L}`]: (HTMLElementTagNameMap[K]['style'])[L]
}
type ElementPropertiesWithoutStyles<K extends keyof HTMLElementTagNameMap> = Omit<Omit<HTMLElementTagNameMap[K], keyof { [K in keyof HTMLElementEventMap as `on${K}`]: any }>, 'style' | 'children'>
type ElementServicePropertiesWithoutPrefix<V> = {
  'if': (context: V) => boolean,
  'for': (context: V) => collection.Flushable<unknown>,
  'each': () => any,
}
type ElementServicePropertiesWithPrefix<V> = {
  [K in keyof ElementServicePropertiesWithoutPrefix<V> as `${typeof DYNAMIC_PROPERTY_PREFIX}${K}`]: ElementServicePropertiesWithoutPrefix<V>[K]
}
type ElementDynamicPropertiesWithPrefix<V, K extends keyof HTMLElementTagNameMap> = {
  [L in keyof (Omit<HTMLElementTagNameMap[K], keyof { [K in keyof HTMLElementEventMap as `on${K}`]: any }>) & string as `${typeof DYNAMIC_PROPERTY_PREFIX}${L}`]: (context: V) => HTMLElementTagNameMap[K][L]
}
type ElementDelegateEventsWithPrefix<V> = {
  [L in keyof HTMLElementEventMap as `${typeof DELEGATE_EVENT_PROPERTY_PREFIX}${L}`]: (event: HTMLElementEventMap[L], context: V, index: number) => void
}
type ElementEventMapper<V> = {
  [K in keyof HTMLElementEventMap as `${typeof COMMON_EVENT_PROPERTY_PREFIX}${K}`]: (event: HTMLElementEventMap[K], context: V) => void
}

type JSXElementProperties<V, K extends keyof HTMLElementTagNameMap> =
  ElementEventMapper<V> &
  ElementStyles<K> &
  ElementPropertiesWithoutStyles<K> &
  ElementDynamicPropertiesWithPrefix<V, K> &
  ElementServicePropertiesWithPrefix<V> &
  ElementDelegateEventsWithPrefix<V>

export type JSXDOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<JSXElementProperties<V, K>>) => any
}

export type EntryPoint<V> = {
  app: (context: V) => void,
  root: HTMLElement
}

export const dom = Object.create(null) as JSXDOMRegistry
export function $<V>(_: any): EntryPoint<V> {
  return {
    app: () => { },
    root: null
  }
}