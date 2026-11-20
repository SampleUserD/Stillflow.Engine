import { Toolkit } from "@/stillflow-vite/vm-abstract"
import { Diagnostics } from "@/stillflow-vite/vm-compiler/vmc.diagnostics"
import { Transform } from "@/stillflow-vite/vm-compiler/vmc.transform"

import { types } from "@babel/core"

export function compiler<T>(transform: Transform<types.JSXElement, T>): Transform<types.JSXElement, T> {
  return (node: types.JSXElement, context: Toolkit, diagnostics: Diagnostics[]) => transform(node, context, diagnostics)
}