import type { Target } from "@/stillflow-vite/vm-abstract"

import type { CodegenContext } from "@/stillflow-vite/target-dom/dom.codegen"

import { build, create_context } from "@/stillflow-vite/target-dom/dom.build"
import { compile } from "@/stillflow-vite/target-dom/dom.compile"
import { emitters } from "@/stillflow-vite/target-dom/dom.codegen"
import { Assembler } from "@/stillflow-vite/vm-instruments"
import { generate, types } from "@babel/core"

export const target_dom: Target = {
  emitters,
  main(element, toolkit, others) {
    const built_element = build(element, create_context(toolkit.context.components))

    if (built_element.ok === false) {
      throw new Error(`IR generation error: ${built_element.error[0].message} at line ${built_element.error[0].position[0]}, column ${built_element.error[0].position[1]}`)
    }

    const compiled_element = compile(built_element.value)

    if (compiled_element.ok === false) {
      throw new Error(`Compilation error: ${compiled_element.error[0].message} at line ${compiled_element.error[0].position[0]}, column ${compiled_element.error[0].position[1]}`)
    }

    const assembler = new Assembler<CodegenContext>(others, toolkit, {
      sf: compiled_element.value.context,
      chunks: compiled_element.value.chunks,
      scopes: [],
      deferred: [],
      symbols: []
    })
    const assembled_element = assembler.assemble(compiled_element.value.code)

    return {
      module: [
        types.importDeclaration(
          [
            types.importSpecifier(
              types.identifier("DELEGATOR"),
              types.identifier("DELEGATOR")
            )
          ],
          types.stringLiteral("stillflow.engine")
        ),
        ...assembled_element.module
      ],
      body: [
        ...assembled_element.body,
        types.returnStatement(
          types.objectExpression([
            types.objectProperty(
              types.identifier('root'),
              types.identifier('__s0')
            ),
            types.objectProperty(
              types.identifier('app'),
              types.identifier('__u0')
            )
          ])
        )
      ]
    }
  }
}