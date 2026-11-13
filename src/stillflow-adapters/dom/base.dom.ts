import { HTML_TAGS } from "./tags.js"
import { AnyDOM } from "./vm/dom.types.js"
import { Properties } from "./properties/properties.js"
import { describe } from "./description/describe.js"
import { Binding } from "../binding.js"
import { apply } from "./vm/compile/dom.apply.js"

type PropertiesWithoutServices<V, K extends keyof HTMLElementTagNameMap> = Omit<Properties<V, K>, 'name'>

type Options = {
  container: HTMLElement
}

export type DOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<PropertiesWithoutServices<V, K>>, children?: Binding<any>[]) => AnyDOM<V>
} & {
  $: <V>(root: AnyDOM<V>, options?: Options) => (context: V) => void
}

const DEFAULT_OPTIONS: Options = {
  container: document.body
}

export const DOM_REGISTRY = Object.create(null) as DOMRegistry

DOM_REGISTRY.$ = function $<V>(root: AnyDOM<V>, options: Options = DEFAULT_OPTIONS) {
  const runner = apply(root)
  const update = (context: V) => runner.run(context)

  options.container.appendChild(runner.root)

  return update
}

for (const tag of HTML_TAGS) {
  DOM_REGISTRY[tag] = <V>(properties: Partial<PropertiesWithoutServices<V, typeof tag>>, children: Binding<any>[] = []) => {
    return describe({ ...properties, name: tag }, children)
  }
}

