import { AnyDOM } from "./dom.types.js"

import * as collection from "@/stillflow-collection/index.js"

const DYNAMIC_PROPERTY_PREFIX = `sf:`
const DELEGATE_EVENT_PROPERTY_PREFIX = `${DYNAMIC_PROPERTY_PREFIX}on-`
const COMMON_EVENT_PROPERTY_PREFIX = `on:`

type ElementStyles<K extends keyof HTMLElementTagNameMap> = { styles: Partial<HTMLElementTagNameMap[K]['style']>, children: any }
type ElementPropertiesWithoutStyles<K extends keyof HTMLElementTagNameMap> = Omit<HTMLElementTagNameMap[K], 'style' | 'children'>
type ElementServicePropertiesWithoutPrefix<V> = {
  'if': (context: V) => boolean,
  'for': (context: V) => collection.Flushable<unknown>,
  'each': () => AnyDOM<V>,
}
type ElementServicePropertiesWithPrefix<V> = {
  [K in keyof ElementServicePropertiesWithoutPrefix<V> as `${typeof DYNAMIC_PROPERTY_PREFIX}${K}`]: ElementServicePropertiesWithoutPrefix<V>[K]
}
type ElementDynamicPropertiesWithPrefix<V, K extends keyof HTMLElementTagNameMap> = {
  [L in (keyof HTMLElementTagNameMap[K]) & string as `${typeof DYNAMIC_PROPERTY_PREFIX}${L}`]: (context: V) => HTMLElementTagNameMap[K][L]
}
type ElementDelegateEventsWithPrefix<V> = {
  [L in keyof HTMLElementEventMap as `${typeof DELEGATE_EVENT_PROPERTY_PREFIX}${L}`]: (event: HTMLElementEventMap[L], context: V) => void
}
type ElementEventMap<V> = {
  [K in keyof HTMLElementEventMap as `${typeof COMMON_EVENT_PROPERTY_PREFIX}${K}`]: (event: HTMLElementEventMap[K], context: V) => void
}

type JSXElementProperties<V, K extends keyof HTMLElementTagNameMap> =
  ElementEventMap<V> &
  ElementStyles<K> &
  ElementPropertiesWithoutStyles<K> &
  ElementDynamicPropertiesWithPrefix<V, K> &
  ElementServicePropertiesWithPrefix<V> &
  ElementDelegateEventsWithPrefix<V>

export type JSXDOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<JSXElementProperties<V, K>>) => AnyDOM<V>
}

export type EntryPoint<V> = (dom: AnyDOM<V>) => {
  app: (root: HTMLElement, context: V) => void,
  root: HTMLElement
}

export const jsxdom = Object.create(null) as JSXDOMRegistry
export const $ = (() => { }) as unknown as EntryPoint<any>