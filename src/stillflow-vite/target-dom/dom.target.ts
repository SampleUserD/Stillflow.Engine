import { collect_compile_map, collect_transform_map } from "@/stillflow-vite/target-dom/dom-collectors/collect-maps"
import { Chunk, Target } from "@/stillflow-vite/vm-abstract"

import { BindingDOM } from "@/stillflow-vite/target-dom/dom.binding"

import { Compiler, CompilerResult } from "@/stillflow-vite/target-dom/dom.compiler"
import { markup } from "@/stillflow-vite/target-dom/dom.markup"

import { types } from "@babel/core"
import { Assembler } from "@/stillflow-vite/vm-instruments"
import { BindingBuilder } from "@/stillflow-vite/target-dom/dom.build-binding"
import { emitters } from "@/stillflow-vite/target-dom/dom.emitters"

export const target_dom: Target = {
  emitters,
  main(element, toolkit, others) {
    const descriptor = BindingBuilder.build(element, toolkit)
    const compiled = new Compiler(toolkit).compile(descriptor)
    const assembler = new Assembler(others, toolkit, compiled)

    const templates: types.Statement[] = []
    const root_id = compiled.compile_map.get(compiled)!

    templates.push(
      types.variableDeclaration('const', [
        types.variableDeclarator(
          types.identifier('set_data'),
          types.memberExpression(
            types.callExpression(
              types.memberExpression(
                types.identifier('Object'),
                types.identifier('getOwnPropertyDescriptor')
              ),
              [
                types.memberExpression(
                  types.identifier('CharacterData'),
                  types.identifier('prototype')
                ),
                types.stringLiteral('data')
              ]
            ),
            types.identifier('set')
          )
        ),
        types.variableDeclarator(
          types.identifier('set_text'),
          types.memberExpression(
            types.callExpression(
              types.memberExpression(
                types.identifier('Object'),
                types.identifier('getOwnPropertyDescriptor')
              ),
              [
                types.memberExpression(
                  types.identifier('Node'),
                  types.identifier('prototype')
                ),
                types.stringLiteral('textContent')
              ]
            ),
            types.identifier('set')
          )
        ),
        types.variableDeclarator(
          types.identifier('replace_children'),
          types.memberExpression(
            types.memberExpression(
              types.identifier('Element'),
              types.identifier('prototype')
            ),
            types.identifier('replaceChildren')
          )
        ),
      ])
    )

    for (const [transformation, index] of compiled.transform_map) {
      templates.push(...transformation.module)
      templates.push(
        types.variableDeclaration('const', [
          types.variableDeclarator(
            types.identifier(`transform_${index}`),
            types.functionExpression(
              null,
              transformation.parameters,
              types.blockStatement([
                ...transformation.body,
                types.returnStatement(
                  transformation.return_expression
                )
              ])
            )
          )
        ])
      )
      templates.push(
        types.variableDeclaration('const', [
          types.variableDeclarator(
            types.identifier(`root_${index}`),
            types.callExpression(
              types.identifier(`transform_${index}`),
              [
                types.callExpression(
                  types.memberExpression(
                    types.identifier('document'),
                    types.identifier('createDocumentFragment')
                  ),
                  []
                )
              ]
            )
          )
        ])
      )
    }

    for (const [compilation, index] of compiled.compile_map) {
      const chunk = assembler.assemble(compilation.bytecode)

      templates.push(
        ...chunk.module,
        types.functionDeclaration(
          types.identifier(`vm_${index}`),
          [types.identifier('root'), types.identifier('context')],
          types.blockStatement([
            ...compilation.markup.body,
            ...chunk.body
          ])
        )
      )
    }

    templates.push(
      types.variableDeclaration('const', [
        types.variableDeclarator(types.identifier('app'), types.identifier(`vm_${root_id}`)),
        types.variableDeclarator(types.identifier('root'), types.identifier(`root_${root_id}`))
      ])
    )

    templates.push(
      types.returnStatement(
        types.objectExpression([
          types.objectProperty(types.identifier('app'), types.identifier('app')),
          types.objectProperty(types.identifier('root'), types.identifier('root'))
        ])
      )
    )

    return {
      module: [
        types.importDeclaration(
          [
            types.importSpecifier(
              types.identifier('DELEGATOR'),
              types.identifier('DELEGATOR')
            ),
          ],
          types.stringLiteral('stillflow.engine')
        )
      ],
      body: templates
    }
  }
}