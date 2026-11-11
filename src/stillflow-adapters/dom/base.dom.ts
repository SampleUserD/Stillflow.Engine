import { HTML_TAGS } from "./tags.js"
import { AnyDOM, DOM } from "./types.js"
import { Properties } from "./properties/properties.js"
import { Compiler } from "./compiler/compile.js"
import { Listeners, Pool } from "./compiler/pool.js"
import { transform } from "./compiler/transform.js"
import { describe } from "./description/describe.js"
import { Binding } from "../binding.js"
import { generate_applier } from "./compiler/apply.generator.js"

type PropertiesWithoutServices<V, K extends keyof HTMLElementTagNameMap> = Omit<Properties<V, K>, 'name'>

export type DOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<PropertiesWithoutServices<V, K>>, children?: Binding<any>[]) => AnyDOM<V>
} & {
  $: <V>(root: AnyDOM<V>) => { element: HTMLElement, update: (context: V) => void, clean: () => void }
}

export const DOM_REGISTRY = Object.create(null) as DOMRegistry

DOM_REGISTRY.$ = function $<V>(root: AnyDOM<V>) {
  const element = transform(root)
  const pool = new Pool(new Listeners())

  const compiler = new Compiler<V>()
  const compilation = compiler.compile(root)

  const applier = generate_applier(compilation, pool)
  const update = (context: V) => applier(element, context)
  const clean = () => pool.tick()

  return { element, update, clean }
}

for (const tag of HTML_TAGS) {
  DOM_REGISTRY[tag] = <V>(properties: Partial<PropertiesWithoutServices<V, typeof tag>>, children: Binding<any>[] = []) => {
    return describe({ ...properties, name: tag }, children)
  }
}

