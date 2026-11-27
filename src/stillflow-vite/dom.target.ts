import { transform } from "@/stillflow-vite/dom.pass.transform"
import { lower_to_bytecode, SymbolScope } from "@/stillflow-vite/vm-compiler"
import { generate_dom } from "@/stillflow-vite/dom.pass.codegen"

import { Target } from "@/stillflow-vite/vm-abstract"
import { types, template } from "@babel/core"

export const target_dom: Target = {
  main(node, components) {
    const transformed = transform(node, components)
    const lowered = lower_to_bytecode(transformed, new SymbolScope())
    const generated = generate_dom(lowered)

    const module_code = template.statements.ast(generated.module.join('\n'))
    const mount_code = template.statements.ast(generated.mount.join('\n'))
    const patch_code = template.statements.ast(generated.patch.join('\n'))

    const patch_site = types.functionDeclaration(
      types.identifier('__patch'),
      [types.identifier('$it')],
      types.blockStatement(patch_code)
    )

    const root_slot = lowered.chunks[lowered.root_chunk_id].root_slot

    const is_controller = lowered.is_controller_slot[root_slot]

    return {
      module: [
        types.importDeclaration([
          types.importSpecifier(
            types.identifier('reconcile_list'),
            types.identifier('reconcile_list')
          )
        ],
          types.stringLiteral('stillflow.engine')
        ),
        ...module_code
      ],
      body: [
        ...mount_code,
        patch_site,
        types.returnStatement(
          types.objectExpression([
            types.objectProperty(
              types.identifier('root'),
              is_controller
                ? types.memberExpression(
                  types.identifier(`__s${root_slot}`),
                  types.identifier('element')
                )
                : types.identifier(`__s${root_slot}`)
            ),
            types.objectProperty(
              types.identifier('app'),
              types.identifier('__patch')
            )
          ])
        )
      ]
    }
  }
}