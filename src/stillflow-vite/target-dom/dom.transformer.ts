import type { BindingDOM } from "@/stillflow-vite/target-dom/dom.binding"
import type { Chunk, Toolkit, Transformed } from "@/stillflow-vite/vm-abstract"

import { types } from "@babel/core"

export class Transformer {
  private static transform_current(binding: BindingDOM, toolkit: Toolkit, depth: number = 1): Chunk {
    let { tag, text, properties, styles, events, directives } = binding.properties

    styles = styles || Object.create(null)
    events = events || Object.create(null)
    properties = properties || Object.create(null)

    const module_statements: types.Statement[] = []
    const body_statements: types.Statement[] = []

    const events_counter = toolkit.counters.create('dom_events')

    const child_id = types.identifier(`sf_child_node_${depth}`)
    const parent_id = types.identifier(`sf_child_node_${depth - 1}`)

    body_statements.push(
      types.variableDeclaration('let', [
        types.variableDeclarator(
          child_id,
          types.callExpression(
            types.memberExpression(types.identifier('document'), types.identifier('createElement')),
            [types.stringLiteral(tag)]
          )
        )
      ])
    )

    if (text !== undefined || directives?.dynamic_text !== undefined) {
      const text_id = types.identifier(`sf_text_node_${depth}`)

      body_statements.push(
        types.variableDeclaration('let', [
          types.variableDeclarator(
            text_id,
            types.callExpression(
              types.memberExpression(types.identifier('document'), types.identifier('createTextNode')),
              [text || types.stringLiteral(String())]
            )
          )
        ]),
        types.expressionStatement(
          types.callExpression(types.memberExpression(child_id, types.identifier('appendChild')), [text_id])
        )
      )
    }

    body_statements.push(
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(parent_id, types.identifier('appendChild')),
          [child_id]
        )
      )
    )

    for (const key in styles) {
      body_statements.push(
        types.expressionStatement(
          types.assignmentExpression(
            '=',
            types.memberExpression(
              types.memberExpression(child_id, types.identifier('style')),
              types.stringLiteral(key),
              true
            ),
            types.stringLiteral(styles[key])
          )
        )
      )
    }

    for (const key in events) {
      const identifier = events_counter.identifier()

      module_statements.push(
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              identifier,
              events[key]
            )
          ]
        )
      )

      body_statements.push(
        types.expressionStatement(
          types.callExpression(
            types.memberExpression(child_id, types.identifier('addEventListener')), [
            types.stringLiteral(key),
            identifier
          ])
        )
      )
    }

    for (const key in properties) {
      body_statements.push(
        types.expressionStatement(
          types.assignmentExpression(
            '=',
            types.memberExpression(child_id, types.stringLiteral(key), true),
            types.stringLiteral(properties[key])
          )
        )
      )
    }

    for (const child of binding.children) {
      const chunk = this.transform_current(child, toolkit, depth + 1)

      body_statements.push(types.blockStatement(chunk.body))
      module_statements.push(...chunk.module)
    }

    return {
      module: module_statements,
      body: body_statements
    }
  }

  public static transform(binding: BindingDOM, toolkit: Toolkit): Transformed {
    const root_statements: types.Statement[] = [
      types.variableDeclaration('let', [
        types.variableDeclarator(types.identifier('sf_child_node_0'), types.identifier('root'))
      ])
    ]

    const code = this.transform_current(binding, toolkit)

    root_statements.push(...code.body)

    return {
      parameters: [types.identifier('root')],
      module: code.module,
      body: root_statements,
      return_expression: types.identifier('sf_child_node_1')
    }
  }
}