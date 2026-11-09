import { Binding } from "../binding.js"
import { AnyDOM } from "./types.js"
import { Properties } from "./properties/properties.js"
import { HTML_TAGS } from "./tags.js"
import { describe } from "./description/describe.js"
import { FlushableCollection } from "../../index.js"

type ElementDynamicContent<V> = (context: V) => string

const DYNAMIC_PROPERTY_CONDITIONAL_MAP = 'conditional'

const DYNAMIC_PROPERTY_PREFIX = `sf:`
const DYNAMIC_PROPERTY_CYCLES = [`${DYNAMIC_PROPERTY_PREFIX}for`, `${DYNAMIC_PROPERTY_PREFIX}each`]
const DYNAMIC_PROPERTY_CONDITIONAL = `${DYNAMIC_PROPERTY_PREFIX}if`
const DELEGATE_EVENT_PROPERTY_PREFIX = `${DYNAMIC_PROPERTY_PREFIX}on-`
const COMMON_EVENT_PROPERTY_PREFIX = `on:`
const COMMON_STYLES_PROPERTY = 'styles'

type ElementStyles<K extends keyof HTMLElementTagNameMap> = { styles: Partial<HTMLElementTagNameMap[K]['style']> }
type ElementPropertiesWithoutStyles<K extends keyof HTMLElementTagNameMap> = Omit<HTMLElementTagNameMap[K], 'style'>
type ElementServicePropertiesWithoutPrefix<V> = {
  'if': (context: V) => boolean,
  'for': (context: V) => FlushableCollection<unknown>,
  'each': () => AnyDOM<V>
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

class JSXDOMUtilities {
  public static patch(object: Record<string, any>, key: string, value: any) {
    object[key] = value
  }

  public static outsort_children<V>(all: any[]) {
    const dynamic_content = new Array<ElementDynamicContent<V>>()
    const static_content = new Array<string>()
    const children = new Array<Binding<any>>()

    for (const child of all) {
      if (typeof child === 'string' || typeof child === 'number') {
        static_content.push(child.toString())
      } else if (typeof child === 'function') {
        dynamic_content.push(child)
      } else if (typeof child === 'object') {
        children.push(child)
      } else {
        throw new Error(`JSX does not support typeof of ${typeof child} element`)
      }
    }

    return { static_content, dynamic_content, children }
  }

  public static map_properties<V, K extends keyof HTMLElementTagNameMap>(jsx: Partial<JSXElementProperties<V, K>>): Required<Properties<V, K>> {
    const jsx_properties = jsx as any
    const dom_properties: Required<Omit<Properties<V, K>, 'name' | 'text'>> = {
      styles: {},
      modifiers: {},
      properties: {},
      events: {}
    }

    for (const property in jsx) {
      if (property.startsWith(COMMON_EVENT_PROPERTY_PREFIX)) {
        this.patch(dom_properties.events, property.slice(COMMON_EVENT_PROPERTY_PREFIX.length), jsx_properties[property])
      } else if (property.startsWith(DELEGATE_EVENT_PROPERTY_PREFIX)) {
        dom_properties.modifiers.events = dom_properties.modifiers.events || {}
        this.patch(dom_properties.modifiers.events, property.slice(DELEGATE_EVENT_PROPERTY_PREFIX.length), jsx_properties[property])
      } else if (property === DYNAMIC_PROPERTY_CONDITIONAL) {
        this.patch(dom_properties.modifiers, DYNAMIC_PROPERTY_CONDITIONAL_MAP, jsx_properties[property])
      } else if (DYNAMIC_PROPERTY_CYCLES.includes(property)) {
        dom_properties.modifiers.iterate = {
          select: jsx_properties[DYNAMIC_PROPERTY_CYCLES[0]],
          each: jsx_properties[DYNAMIC_PROPERTY_CYCLES[1]]
        }
      } else if (property.startsWith(DYNAMIC_PROPERTY_PREFIX)) {
        dom_properties.modifiers.properties = dom_properties.modifiers.properties || {}
        this.patch(dom_properties.modifiers.properties, property.slice(DYNAMIC_PROPERTY_PREFIX.length), jsx_properties[property])
      } else if (property === COMMON_STYLES_PROPERTY) {
        this.patch(dom_properties, property, jsx_properties[property])
      } else {
        this.patch(dom_properties.properties, property, jsx_properties[property])
      }
    }

    return dom_properties as Required<Properties<V, K>>
  }
}

export type JSXDOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<JSXElementProperties<V, K>>, all: any[]) => AnyDOM<V>
}

export const JSXDOM_REGISTRY = Object.create(null) as JSXDOMRegistry

for (const tag of HTML_TAGS) {
  (JSXDOM_REGISTRY as any)[tag] = <T>(context: Partial<JSXElementProperties<T, typeof tag>>, all: any[]) => {
    const { static_content, dynamic_content, children } = JSXDOMUtilities.outsort_children<T>(all)
    const properties = JSXDOMUtilities.map_properties<T, typeof tag>(context)

    properties.modifiers.text = (context: T) => {
      let contents = String()

      for (const site of dynamic_content) {
        contents += site(context)
      }

      return contents
    }

    properties.text = static_content.join(String())

    properties.name = tag

    return describe(properties, children)
  }
}