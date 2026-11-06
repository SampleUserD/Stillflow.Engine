import { HTML_TAGS } from "./tags.js"
import { describe } from "./description/describe.js"
import { AnyDOM, DOM } from "./dom.js"
import { Properties } from "./properties/properties.js"
import { Compiler } from "./compiler/compile.js"
import { Appliers } from "./compiler/apply.js"
import { transform } from "./compiler/transform.js"

function $<V>(root: AnyDOM<V>) {
  const element = transform(root)

  const compiler = new Compiler<V>()
  const compilation = compiler.compile(root)

  const appliers = new Appliers<V>()
  const applier = appliers.apply(compilation)

  const update = (context: V) => applier(element, context)

  return { element, update }
}

type Descriptions = {
  [K in keyof HTMLElementTagNameMap]: <V>(p: Omit<Properties<V, K>, 'name'>, c?: AnyDOM<V>[]) => DOM<V, K>
} & {
  $: typeof $
}

const dom: Descriptions = {} as Descriptions

for (const tag of HTML_TAGS) {
  (dom as any)[tag] = <V>(p: Omit<Properties<V, typeof tag>, 'name'>, c: AnyDOM<V>[] = []) => describe({ ...p, name: tag }, c)
}

dom['$'] = $

export { dom }

