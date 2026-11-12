import { HTML_TAGS } from "./tags.js"
import { AnyDOM, DOM } from "./aot/dom.types.js"
import { Properties } from "./properties/properties.js"
import { transform } from "./aot/transformers/transform.js"
import { describe } from "./description/describe.js"
import { Binding } from "../binding.js"
import { apply } from "./aot/appliers/apply.js"
import { EventDelegator } from "./aot/dom.delegator.js"
import { Pool } from "./aot/dom.pool.js"

const DELEGATOR = new EventDelegator()

type PropertiesWithoutServices<V, K extends keyof HTMLElementTagNameMap> = Omit<Properties<V, K>, 'name'>

type Options = {
  gc: (site: () => void) => void
}

export type DOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<PropertiesWithoutServices<V, K>>, children?: Binding<any>[]) => AnyDOM<V>
} & {
  $: <V>(root: AnyDOM<V>, options?: Options) => { element: HTMLElement, update: (context: V) => void }
}

export const DOM_REGISTRY = Object.create(null) as DOMRegistry

DOM_REGISTRY.$ = function $<V>(root: AnyDOM<V>, options: Options = { gc: site => site() }) {
  const pool = new Pool()
  const element = transform(root)
  const applier = apply(root, DELEGATOR, pool)

  let cleaning = false

  const update = (context: V) => {
    if (!cleaning) {
      cleaning = true

      options.gc(() => {
        pool.tick()
        cleaning = false
      })
    }

    applier(element, context)
  }

  return { element, update }
}

for (const tag of HTML_TAGS) {
  DOM_REGISTRY[tag] = <V>(properties: Partial<PropertiesWithoutServices<V, typeof tag>>, children: Binding<any>[] = []) => {
    return describe({ ...properties, name: tag }, children)
  }
}

