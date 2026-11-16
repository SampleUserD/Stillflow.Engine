import { BuildTimeDOMElement } from "@/stillflow-vite/dom/build-vm/build.dom"
import { AnyDOM } from "@/stillflow-vite/dom/properties/types"
import { SF_CACHE, SF_CACHE_TEXT } from "@/stillflow-vite/dom/utilities/symbols"
import { types } from "@babel/core"

export interface MarkupResult {
  parameters: types.Identifier[],
  body: types.Statement[]
}

function markup_template_code(node: BuildTimeDOMElement, path: number[], statements: types.Statement[]) {
  const { modifiers } = node.properties

  const has_modifiers =
    modifiers?.text !== undefined ||
    modifiers?.properties !== undefined ||
    modifiers?.events !== undefined ||
    modifiers?.iterate !== undefined ||
    modifiers?.conditional !== undefined

  if (has_modifiers) {
    let member: types.Expression = types.identifier('root')

    for (const index of path) {
      member = types.memberExpression(member, types.identifier('children'))
      member = types.memberExpression(member, types.numericLiteral(index), true)
    }

    statements.push(
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(types.identifier('sf_markup_path'), types.identifier('push')),
          [member]
        )
      )
    )
  }

  for (let index = 0; index < node.children.length; index++) {
    markup_template_code(node.children[index], [...path, index], statements)
  }
}

export function markup(node: BuildTimeDOMElement): MarkupResult {
  let body: types.Statement[] = []

  body.push(
    types.variableDeclaration('let', [
      types.variableDeclarator(types.identifier('sf_markup_path'), types.arrayExpression([]))
    ])
  )

  markup_template_code(node, [], body)

  body.push(
    types.expressionStatement(
      types.assignmentExpression(
        '=',
        types.memberExpression(types.identifier('root'), types.identifier(SF_CACHE)),
        types.identifier('sf_markup_path')
      )
    ),
    types.expressionStatement(
      types.assignmentExpression(
        '=',
        types.memberExpression(types.identifier('root'), types.identifier(SF_CACHE_TEXT)),
        types.callExpression(
          types.memberExpression(types.identifier('sf_markup_path'), types.identifier('map')),
          [
            types.arrowFunctionExpression(
              [types.identifier('node')],
              types.memberExpression(types.identifier('node'), types.identifier('firstChild'))
            )
          ]
        )
      )
    )
  )

  body = [
    types.ifStatement(
      types.unaryExpression('!', types.memberExpression(types.identifier('root'), types.identifier(SF_CACHE))),
      types.blockStatement(body)
    )
  ]

  return {
    parameters: [types.identifier('root')],
    body
  }
}
