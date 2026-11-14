import * as vm from '../../stillflow-vm/index.js'

import { HTML_TAGS } from "./tags.js"
import { AnyDOM } from "./vm/dom.types.js"
import { Properties } from "./properties/properties.js"
import { describe } from "./description/describe.js"
import { Binding } from "../../stillflow-vm/binding.js"
import { apply } from "./vm/compile/dom.apply.js"
import { apply_keyed } from './vm/compile/dom.apply.keyed.js'

type PropertiesWithoutServices<V, K extends keyof HTMLElementTagNameMap> = Omit<Properties<V, K>, 'name'>

type Options = {
  mode?: 'keyed' | 'non-keyed'
  container: HTMLElement
}

export type DOMRegistry = {
  [K in keyof HTMLElementTagNameMap]: <V>(properties: Partial<PropertiesWithoutServices<V, K>>, children?: Binding<any>[]) => AnyDOM<V>
} & {
  $: <V>(root: AnyDOM<V>, options?: Options) => (context: V) => void
  $compile: vm.Compiler<Properties<any, any>, HTMLElement>
}

const DEFAULT_OPTIONS: Options = {
  mode: undefined,
  container: document.body
}

export const DOM_REGISTRY = Object.create(null) as DOMRegistry

DOM_REGISTRY.$ = function $<V>(root: AnyDOM<V>, options: Options = DEFAULT_OPTIONS) {
  let runner: vm.Target<HTMLElement, V>

  switch (options.mode) {
    case 'keyed':
      runner = apply_keyed(root)
      break
    case 'non-keyed':
    default:
      runner = apply(root)
  }

  const update = (context: V) => runner.applier(runner.root, context)

  options.container.appendChild(runner.root)

  return update
}

DOM_REGISTRY.$compile = function $compile<V>(node: AnyDOM<V>) {
  return apply(node)
}

for (const tag of HTML_TAGS) {
  DOM_REGISTRY[tag] = <V>(properties: Partial<PropertiesWithoutServices<V, typeof tag>>, children: Binding<any>[] = []) => {
    return describe({ ...properties, name: tag }, children)
  }
}

