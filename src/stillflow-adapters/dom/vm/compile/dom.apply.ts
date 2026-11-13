import * as vm from '../../../../stillflow-vm/index.js'

import { Properties } from '../../properties/properties.js'

import { AnyDOM } from "../dom.types.js"
import { run_dom_vm } from "./dom.compile-vm.js"
import { compile } from "./dom.compile.js"

export const apply: vm.Compiler<Properties<any, any>, HTMLElement> = <V>(node: AnyDOM<V>) => {
  const compilation = compile(node)
  const applier = run_dom_vm(compilation)

  return {
    root: compilation.root,
    applier: (root: HTMLElement, context: V) => applier(root, context),
    dispose: (root: HTMLElement) => root.remove()
  }
}