import * as vm from '@/stillflow-vite/babel-vm/index'

import { markup } from '@/stillflow-vite/dom/build-vm/markup'
import { generators } from '@/stillflow-vite/dom/directives/generators'
import { Template } from '@/stillflow-vite/dom/build-vm/template'
import { DELEGATOR } from '@/stillflow-runtime/utilities/delegator'
import { types } from '@babel/core'

export type Context = Template & {
  payload: vm.Payload,
  delegator: typeof DELEGATOR,
  tables: Map<number, { props: types.Node[] }>,
  counters: {
    registrations: number,
    properties: number,
    creations: number,
    texts: number
  }
}

const dom_vm = vm.create<Template, Context>({
  context: {
    counters: {
      registrations: 0,
      properties: 0,
      creations: 0,
      texts: 0
    }
  },
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
    tables: new Map(),
    counters: configurator.context.counters as any
  }
}

export const run = (template: Template) => dom_vm(template, create_context)