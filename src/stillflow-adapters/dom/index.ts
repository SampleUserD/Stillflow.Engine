import { HTML_TAGS } from "./tags.js"
import { describe } from "./description/describe.js"
import { AnyDOM, DOM } from "./dom.js"
import { Properties } from "./properties/properties.js"
import { transform } from "./compiler/transform.js"
import { compile } from "./compiler/compile.js"
import { apply } from "./compiler/apply.js"

type Descriptions = {
  [K in keyof HTMLElementTagNameMap]: <V>(p: Omit<Properties<V, K>, 'name'>, c?: AnyDOM<V>[]) => DOM<V, K>
} & {
  transform: typeof transform,
  compile: typeof compile,
  apply: typeof apply
}

const dom: Descriptions = {} as Descriptions

for (const tag of HTML_TAGS) {
  (dom as any)[tag] = <V>(p: Omit<Properties<V, typeof tag>, 'name'>, c: AnyDOM<V>[] = []) => describe({ ...p, name: tag }, c)
}

dom['transform'] = transform
dom['compile'] = compile
dom['apply'] = apply

export { dom }

