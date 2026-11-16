import * as vm from '@/stillflow-vite/babel-vm/index'

import { types } from '@babel/core'
import { BuildTimeDOMElement } from '@/stillflow-vite/dom/build-vm/build.dom'

export interface TransformResult {
  body: types.Statement[],
  parameters: types.Identifier[]
  payloads: vm.Payload,
  return_expression: types.Expression
}

function transform_code(description: BuildTimeDOMElement, payloads: vm.Payload, depth: number = 1): types.Statement[] {
  let { name, text, properties, styles, events, modifiers } = description.properties

  styles = styles || Object.create(null)
  events = events || Object.create(null)
  properties = properties || Object.create(null)

  const statements: types.Statement[] = []

  const nameIndex = payloads.add(name, vm.Payload.RESOLVE_STRING)

  const childId = types.identifier(`sf_child_node_${depth}`)
  const parentId = types.identifier(`sf_child_node_${depth - 1}`)

  statements.push(
    types.variableDeclaration('let', [
      types.variableDeclarator(
        childId,
        types.callExpression(
          types.memberExpression(types.identifier('document'), types.identifier('createElement')),
          [types.identifier(nameIndex.payload)]
        )
      )
    ])
  )

  if (text !== undefined || modifiers?.text !== undefined) {
    const textId = types.identifier(`sf_text_node_${depth}`)

    statements.push(
      types.variableDeclaration('let', [
        types.variableDeclarator(
          textId,
          types.callExpression(
            types.memberExpression(types.identifier('document'), types.identifier('createTextNode')),
            [text || types.stringLiteral(String())]
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
    const keyIndex = payloads.add(key, vm.Payload.RESOLVE_STRING)
    const styleIndex = payloads.add((styles as any)[key], vm.Payload.RESOLVE_STRING)

    statements.push(
      types.expressionStatement(
        types.assignmentExpression(
          '=',
          types.memberExpression(
            types.memberExpression(childId, types.identifier('style')),
            types.identifier(keyIndex.payload),
            true
          ),
          types.identifier(styleIndex.payload)
        )
      )
    )
  }

  for (const key in events) {
    const eventIndex = payloads.add((events as any)[key], vm.Payload.RESOLVE_NODE)

    statements.push(
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(childId, types.identifier('addEventListener')), [
          types.stringLiteral(key),
          types.identifier(eventIndex.payload)
        ])
      )
    )
  }

  for (const key in properties) {
    const keyIndex = payloads.add(key, vm.Payload.RESOLVE_STRING)
    const propertyIndex = payloads.add((properties as any)[key], vm.Payload.RESOLVE_STRING)

    statements.push(
      types.expressionStatement(
        types.assignmentExpression(
          '=',
          types.memberExpression(childId, types.identifier(keyIndex.payload), true),
          types.identifier(propertyIndex.payload)
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

export function transform(description: BuildTimeDOMElement): TransformResult {
  const payloads = new vm.Payload()

  const root_statements: types.Statement[] = [
    types.variableDeclaration('let', [
      types.variableDeclarator(types.identifier('sf_child_node_0'), types.identifier('root'))
    ])
  ]

  root_statements.push(...transform_code(description, payloads))

  const return_expression = types.identifier('sf_child_node_1')

  return {
    payloads,
    parameters: [types.identifier('root'), ...payloads.parameters.map(parameter => types.identifier(parameter))],
    body: root_statements,
    return_expression
  }
}