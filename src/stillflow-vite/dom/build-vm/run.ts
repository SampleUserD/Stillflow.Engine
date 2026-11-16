import * as vm from '@/stillflow-vite/babel-vm/index'

import { types } from '@babel/core'
import { markup } from '@/stillflow-vite/dom/build-vm/markup'
import { generators } from '@/stillflow-vite/dom/directives/generators'
import { Template } from '@/stillflow-vite/dom/build-vm/template'
import { SF_CACHE, SF_CACHE_TEXT } from '@/stillflow-runtime/utilities/symbols'
import { DELEGATOR } from '@/stillflow-runtime/utilities/delegator'

export type Context = Template & { payload: vm.Payload, delegator: typeof DELEGATOR }

const dom_vm = vm.create<Template, Context>({
  generators,
  preamble(context) {
    const markup_result = markup(context.node)

    return [
      ...markup_result.body,
      // const sf_node_cache = root[SF_CACHE];
      types.variableDeclaration('const', [
        types.variableDeclarator(
          types.identifier('sf_node_cache'),
          types.memberExpression(types.identifier('root'), types.identifier(SF_CACHE))
        )
      ]),

      // const sf_text_cache = root[SF_CACHE_TEXT];
      types.variableDeclaration('const', [
        types.variableDeclarator(
          types.identifier('sf_text_cache'),
          types.memberExpression(types.identifier('root'), types.identifier(SF_CACHE_TEXT))
        )
      ])
    ]
  },
  epilogue() {
    return []
  }
})

const create_context = (payload: vm.Payload, input: Template) => {
  return {
    ...input,
    payload,
    delegator: DELEGATOR
  }
}

export const run = (template: Template) => dom_vm(template, create_context)