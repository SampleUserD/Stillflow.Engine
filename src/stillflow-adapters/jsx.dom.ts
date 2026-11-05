import { Collection } from "../index.js"
import { AnyDOM, DOM } from "./dom/dom.js"
import { Properties } from "./dom/properties/properties.js"
import { HTML_TAGS } from "./dom/tags.js"
import { dom } from "./index.js"

type JSXProperties<V, K extends keyof HTMLElementTagNameMap> = Omit<HTMLElementTagNameMap[K], 'style' | 'children'>
  & HTMLElementEventMap
  & {
    'text': string,
    'styles': HTMLElementTagNameMap[K]['style'],
    'sf-text': (context: V) => string
    'sf-for': (context: V) => Collection<unknown>,
    'sf-each': () => AnyDOM<V>
  } & {
    [L in (keyof HTMLElementTagNameMap[K]) & string as `sf-$${L}`]: (context: V) => HTMLElementTagNameMap[K][L]
  } & {
    [L in keyof HTMLElementEventMap as `sf-on${L}`]: (event: HTMLElementEventMap[L], context: V) => void
  } & {
    'children': AnyDOM<V>[]
  }

type JSXDescriptions = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<JSXProperties<V, K>>) => DOM<V, K>
} & {
  $: typeof dom.$
}

const JSX_TO_DOM_CACHE = new WeakMap<Partial<JSXProperties<any, any>>, Properties<any, any>>()

function map_jsx_to_dom<V, K extends keyof HTMLElementTagNameMap>(jsx: Partial<JSXProperties<V, K>>): Omit<Properties<V, K>, 'name'> {
  if (jsx === null || jsx === undefined) {
    throw new Error(`JSX cannot be empty`)
  }

  let dom = JSX_TO_DOM_CACHE.get(jsx as Partial<JSXProperties<any, any>>) as Required<Omit<Properties<V, K>, 'name'>>

  if (dom !== undefined) {
    return dom
  }

  dom = {
    events: {},
    properties: {},
    modifiers: {},
    styles: jsx.styles ?? {},
    text: jsx.text ?? String()
  }

  for (const key in jsx) {
    if (key.startsWith('on')) {
      (dom.events as any)[key] = (jsx as any)[key]
    } else if (key === 'sf-for' || key === 'sf-each') {
      dom.modifiers.iterate = {
        select: (jsx as any)['sf-for'],
        each: (jsx as any)['sf-each']
      }
    } else if (key === 'sf-text') {
      dom.modifiers.text = (jsx as any)['sf-text']
    } else if (key.startsWith('sf-on')) {
      dom.modifiers.events = dom.modifiers.events || {};
      (dom.modifiers.events as any)[key.slice('sf-on'.length)] = (jsx as any)[key]
    } else if (key.startsWith('sf-$')) {
      dom.modifiers.properties = dom.modifiers.properties || {};
      (dom.modifiers.properties as any)[key.slice('sf-$'.length)] = (jsx as any)[key]
    }
  }

  return dom
}

const jsxdom: JSXDescriptions = {} as JSXDescriptions

for (const tag of HTML_TAGS) {
  (jsxdom as any)[tag] = <V>(properties: Partial<JSXProperties<V, typeof tag>>) => dom[tag](map_jsx_to_dom(properties), properties.children ?? [])
}

jsxdom['$'] = dom.$

export { jsxdom }