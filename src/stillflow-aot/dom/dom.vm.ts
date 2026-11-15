import * as vm from '@vm/index'

import { Context } from "@/stillflow-aot/dom/dom.context"
import { Template } from "@/stillflow-aot/dom/dom.template"
import { SF_CACHE, SF_CACHE_TEXT } from "@/stillflow-aot/dom/dom.symbols"
import { types } from "@babel/core"
import { markup } from "@/stillflow-aot/dom/compile/dom.markup"
import { vm_create } from "@/stillflow-aot/vm/vm.create"
import { generators } from '@/stillflow-aot/dom/dom.generators'
import { EventDelegator } from '@/stillflow-aot/dom/utilities/dom.delegator'

export const DELEGATOR = new EventDelegator()

const dom_vm = vm_create<Template, Context>({
  generators: generators,
  preamble(context) {
    const markupResult = markup(context.node)

    return [
      // инлайн markup
      ...markupResult.body,

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

export const run_dom_vm = (template: Template, resolve: (value: any) => types.Node) => {
  return dom_vm(template.bytecode, template, create_context, resolve)
}