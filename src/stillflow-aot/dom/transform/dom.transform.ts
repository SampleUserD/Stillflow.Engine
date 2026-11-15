import { types } from '@babel/core'

import * as vm from '@vm/index'
import { AnyDOM } from '@/stillflow-aot/dom/dom.types'

export interface TransformResult {
  parameters: types.Identifier[]
  payloads: any[],
  body: types.Statement[],
  return_expression: types.Expression
}

function transform_code<V>(description: AnyDOM<V>, payloads: vm.Payload, depth: number = 1): types.Statement[] {
  let { name, text, properties, styles, events, modifiers } = description.properties

  styles = styles || Object.create(null)
  events = events || Object.create(null)
  properties = properties || Object.create(null)

  const statements: types.Statement[] = []

  const nameIndex = payloads.add_payload(name)

  const childId = types.identifier(`sf_child_node_${depth}`)
  const parentId = types.identifier(`sf_child_node_${depth - 1}`)

  statements.push(
    types.variableDeclaration('let', [
      types.variableDeclarator(
        childId,
        types.callExpression(
          types.memberExpression(types.identifier('document'), types.identifier('createElement')),
          [types.identifier(nameIndex)]
        )
      )
    ])
  )

  if (text !== undefined || modifiers?.text !== undefined) {
    const textIndex = payloads.add_payload(text)
    const textId = types.identifier(`sf_text_node_${depth}`)

    statements.push(
      types.variableDeclaration('let', [
        types.variableDeclarator(
          textId,
          types.callExpression(
            types.memberExpression(types.identifier('document'), types.identifier('createTextNode')),
            [types.identifier(textIndex)]
          )
        )
      ]),
      types.expressionStatement(
        types.callExpression(types.memberExpression(childId, types.identifier('appendChild')), [textId])
      )
    )
  }

  statements.push(
    types.expressionStatement(
      types.callExpression(
        types.memberExpression(parentId, types.identifier('appendChild')),
        [childId]
      )
    )
  )

  for (const key in styles) {
    const keyIndex = payloads.add_payload(key)
    const styleIndex = payloads.add_payload((styles as any)[key])

    statements.push(
      types.expressionStatement(
        types.assignmentExpression(
          '=',
          types.memberExpression(
            types.memberExpression(childId, types.identifier('style')),
            types.identifier(keyIndex),
            true
          ),
          types.identifier(styleIndex)
        )
      )
    )
  }

  for (const key in events) {
    const eventIndex = payloads.add_payload((events as any)[key])

    statements.push(
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(childId, types.identifier('addEventListener')), [
          types.stringLiteral(key),
          types.identifier(eventIndex)
        ])
      )
    )
  }

  for (const key in properties) {
    const keyIndex = payloads.add_payload(key)
    const propertyIndex = payloads.add_payload((properties as any)[key])

    statements.push(
      types.expressionStatement(
        types.assignmentExpression(
          '=',
          types.memberExpression(childId, types.identifier(keyIndex), true),
          types.identifier(propertyIndex)
        )
      )
    )
  }

  for (const child of description.children) {
    const block: types.Statement[] = transform_code(child, payloads, depth + 1)

    statements.push(types.blockStatement(block))
  }

  return statements
}

export function transform<V>(description: AnyDOM<V>): TransformResult {
  const payloads = new vm.Payload()

  const root_statements: types.Statement[] = [
    types.variableDeclaration('let', [
      types.variableDeclarator(types.identifier('sf_child_node_0'), types.identifier('root'))
    ])
  ]

  root_statements.push(...transform_code(description, payloads))

  const return_expression = types.identifier('sf_child_node_1')

  return {
    payloads: payloads.values,
    parameters: [types.identifier('root'), ...payloads.values.map((_, i) => types.identifier(`p${i}`))],
    body: root_statements,
    return_expression
  }
}