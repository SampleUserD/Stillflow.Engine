import { HTML_TAGS } from "./tags.js"
import { AnyDOM, DOM } from "./dom.js"
import { Properties } from "./properties/properties.js"
import { Compiler } from "./compiler/compile.js"
import { Appliers } from "./compiler/apply.js"
import { transform } from "./compiler/transform.js"
import { describe } from "./description/describe.js"
import { Binding } from "../binding.js"

type PropertiesWithoutServices<V, K extends keyof HTMLElementTagNameMap> = Omit<Properties<V, K>, 'name'>

export type DOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<PropertiesWithoutServices<V, K>>, children?: Binding<any>[]) => AnyDOM<V>
}

export const DOM_REGISTRY = Object.create(null) as DOMRegistry

export class DOMAdapter<V> {
  public $(root: AnyDOM<V>) {
    const element = transform(root)

    const compiler = new Compiler<V>()
    const compilation = compiler.compile(root)

    const appliers = new Appliers<V>()
    const applier = appliers.apply(compilation)

    const update = (context: V) => applier(element, context)

    return { element, update }
  }
}

for (const tag of HTML_TAGS) {
  DOM_REGISTRY[tag] = <V>(properties: Partial<PropertiesWithoutServices<V, typeof tag>>, children: Binding<any>[] = []) => {
    return describe({ ...properties, name: tag }, children)
  }
}

