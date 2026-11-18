import * as vm from '@/stillflow-vite/babel-vm/index'

import { types } from '@babel/core'
import { BuildTimeDOMElement } from '@/stillflow-vite/dom/build-vm/build.dom'
import { Environment } from '@/stillflow-vite/dom/environment'

export interface TransformResult {
  body: types.Statement[],
  outer: types.Statement[],
  parameters: types.Identifier[]
  payloads: vm.Payload,
  return_expression: types.Expression
}

function transform_code(description: BuildTimeDOMElement, state: Environment, depth: number = 1): { body: types.Statement[], outer: types.Statement[] } {
  let { name, text, properties, styles, events, modifiers } = description.properties

  styles = styles || Object.create(null)
  events = events || Object.create(null)
  properties = properties || Object.create(null)

  const statements: types.Statement[] = []
  const outer: types.Statement[] = []

  const childId = types.identifier(`sf_child_node_${depth}`)
  const parentId = types.identifier(`sf_child_node_${depth - 1}`)

  statements.push(
    types.variableDeclaration('let', [
      types.variableDeclarator(
        childId,
        types.callExpression(
          types.memberExpression(types.identifier('document'), types.identifier('createElement')),
          [types.stringLiteral(name)]
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
    statements.push(
      types.expressionStatement(
        types.assignmentExpression(
          '=',
          types.memberExpression(
            types.memberExpression(childId, types.identifier('style')),
            types.stringLiteral(key),
            true
          ),
          types.stringLiteral((styles as any)[key])
        )
      )
    )
  }

  for (const key in events) {
    const current = state.counters.get('sf_common_events') || 0

    outer.push(
      types.variableDeclaration(
        'const',
        [
          types.variableDeclarator(
            types.identifier(`e${current}`),
            (events as any)[key]
          )
        ]
      )
    )

    statements.push(
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(childId, types.identifier('addEventListener')), [
          types.stringLiteral(key),
          types.identifier(`e${current}`)
        ])
      )
    )

    state.counters.set('sf_common_events', current + 1)
  }

  for (const key in properties) {
    statements.push(
      types.expressionStatement(
        types.assignmentExpression(
          '=',
          types.memberExpression(childId, types.stringLiteral(key), true),
          types.stringLiteral((properties as any)[key])
        )
      )
    )
  }

  for (const child of description.children) {
    const block = transform_code(child, state, depth + 1)

    statements.push(types.blockStatement(block.body))
    outer.push(...block.outer)
  }

  return {
    body: statements,
    outer: outer
  }
}

export function transform(description: BuildTimeDOMElement, state: Environment): TransformResult {
  const payloads = new vm.Payload()

  const root_statements: types.Statement[] = [
    types.variableDeclaration('let', [
      types.variableDeclarator(types.identifier('sf_child_node_0'), types.identifier('root'))
    ])
  ]
  const transformed = transform_code(description, state)

  root_statements.push(...transformed.body)

  const return_expression = types.identifier('sf_child_node_1')

  return {
    payloads,
    parameters: [types.identifier('root'), ...payloads.parameters.map(parameter => types.identifier(parameter))],
    body: root_statements,
    outer: transformed.outer,
    return_expression
  }
}