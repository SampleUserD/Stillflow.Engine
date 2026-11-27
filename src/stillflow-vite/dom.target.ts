import { transform } from "@/stillflow-vite/dom.pass.transform"
import { lower_to_bytecode, SymbolScope } from "@/stillflow-vite/vm-compiler"
import { emit_dirty_prologue, generate_dom } from "@/stillflow-vite/dom.pass.codegen"

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

    const root_chunk = lowered.chunks[lowered.root_chunk_id]

    const prologue = emit_dirty_prologue(root_chunk.captures, (name, bit) => {
      return `if ($next !== undefined) { $it = $next; __dirty |= ${bit}; }`
    })

    const dirty_prologue = template.statements.ast(prologue.join('\n'))

    const root_slots = root_chunk.root_slots

    for (const slot of root_slots) {
      const is_controller_slot = lowered.is_controller_slot[slot]

      mount_code.push(
        types.expressionStatement(
          types.callExpression(
            types.memberExpression(
              types.identifier('$parent'),
              types.identifier('appendChild')
            ),
            [is_controller_slot ? types.memberExpression(types.identifier(`__s${slot}`), types.identifier(`element`)) : types.identifier(`__s${slot}`)]
          )
        )
      )
    }

    const patch_site = types.functionDeclaration(
      types.identifier('__patch'),
      [types.identifier('$next')],
      types.blockStatement([
        ...dirty_prologue,
        ...patch_code
      ])
    )

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
          types.identifier('__patch')
        )
      ]
    }
  }
}