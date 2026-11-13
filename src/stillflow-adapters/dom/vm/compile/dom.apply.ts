import { AnyDOM } from "../dom.types.js"
import { run_dom_vm } from "./dom.compile-vm.js"
import { compile } from "./dom.compile.js"

export function apply<V>(node: AnyDOM<V>) {
  const compilation = compile(node)
  const applier = run_dom_vm(compilation)

  return {
    root: compilation.root,
    run: (context: V) => applier(compilation.root, context)
  }
}