import * as vm from '@vm/index'

import { Properties } from '@adapters/dom/properties/properties'
import { AnyDOM } from "../dom.types"

import { run_dom_vm_keyed } from "./dom.compile-vm.keyed"
import { compile } from "./dom.compile"

export const apply_keyed: vm.Compiler<Properties<any, any>, HTMLElement> = <V>(node: AnyDOM<V>) => {
  const compilation = compile(node)
  const applier = run_dom_vm_keyed(compilation)

  return {
    root: compilation.root,
    applier: (root: HTMLElement, context: V) => applier(root, context),
  }
}