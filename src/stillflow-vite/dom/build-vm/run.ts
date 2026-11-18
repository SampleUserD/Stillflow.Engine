import * as vm from '@/stillflow-vite/babel-vm/index'

import { markup } from '@/stillflow-vite/dom/build-vm/markup'
import { generators } from '@/stillflow-vite/dom/directives/generators'
import { Template } from '@/stillflow-vite/dom/build-vm/template'
import { DELEGATOR } from '@/stillflow-runtime/utilities/delegator'
import { types } from '@babel/core'

export type Context = Template & {
  payload: vm.Payload,
  delegator: typeof DELEGATOR,
  tables: Map<number, { props: types.Node[] }>
}

const dom_vm = vm.create<Template, Context>({
  generators,
  preamble(context) {
    const markup_result = markup(context.node)

    return markup_result.body
  },
  epilogue() {
    return []
  }
})

const create_context = (payload: vm.Payload, input: Template, configurator: vm.Configurator<Context>) => {
  return {
    ...input,
    payload,
    delegator: DELEGATOR,
    tables: new Map()
  }
}

export const run = (template: Template) => dom_vm(template, create_context)