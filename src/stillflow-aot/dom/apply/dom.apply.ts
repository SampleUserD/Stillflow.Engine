import { types } from '@babel/core'

import { Template } from '@/stillflow-aot/dom/dom.template'
import { VMGenerated } from '@/stillflow-aot/vm/vm.generated'

export interface ApplyResult {
  payloads: any[]
  parameters: types.Identifier[],
  body: types.Statement[],
}

export function apply(template: Template, vm: VMGenerated) {
  const body: types.Statement[] = []

  body.push(
    types.expressionStatement(
      types.callExpression(types.identifier('markupN'), [types.identifier('root')])
    )
  )

  body.push(...vm.body)

  return {
    parameters: [types.identifier('root'), types.identifier('context')],
    payloads: vm.values,
    body
  }
}