import * as vm from '@/stillflow-vite/babel-vm/index'

import { types } from '@babel/core'
import { Codes } from '@/stillflow-vite/dom/directives/codes'
import { BuildTimeDOMElement } from '@/stillflow-vite/dom/build-vm/build.dom'
import { Template } from '@/stillflow-vite/dom/build-vm/template'
import { Environment } from '@/stillflow-vite/dom/environment'
import { transform } from '@/stillflow-vite/dom/build-vm/transform'

export function create_compiler(map: (each: types.Node) => BuildTimeDOMElement) {
  let environment: Environment

  function resolve(template: Template) {
    return types.identifier(`vm${environment.template_map.get(template)!}`)
  }

  function bind(supposed_environment: Environment) {
    environment = supposed_environment
  }

  function compile(node: BuildTimeDOMElement): Template {
    const emitter = new vm.Emitter()
    const strings = new vm.Payload()
    const functions = new vm.Payload()
    const templates = new vm.Payload()
    const nodes = new vm.Payload()

    let next_node_id = 0

    function walk(current: BuildTimeDOMElement) {
      const { modifiers } = current.properties

      const has_properties = modifiers?.properties !== undefined
      const has_events = modifiers?.events !== undefined
      const has_text = modifiers?.text !== undefined
      const has_for = modifiers?.iterate !== undefined
      const has_if = modifiers?.conditional !== undefined
      const has_vm = modifiers?.vm !== undefined

      let current_id = -1

      if (has_properties || has_events || has_text || has_for || has_if || has_vm) {
        current_id = next_node_id++
      }

      if (has_properties) {
        const properties = modifiers!.properties as any

        for (const key in properties) {
          const propertyIndex = strings.add(key, vm.Payload.RESOLVE_STRING)
          const functionIndex = functions.add(properties[key], vm.Payload.RESOLVE_NODE)

          emitter.emit(Codes.PROPERTY, current_id, propertyIndex.index, functionIndex.index)
        }
      }

      if (has_events) {
        const events = modifiers!.events as any

        for (const key in events) {
          const propertyIndex = strings.add(key, vm.Payload.RESOLVE_STRING)
          const functionIndex = functions.add(events[key], vm.Payload.RESOLVE_NODE)

          emitter.emit(Codes.EVENT, current_id, propertyIndex.index, functionIndex.index)
        }
      }

      if (has_text) {
        const functionIndex = functions.add(modifiers!.text!, vm.Payload.RESOLVE_NODE)

        emitter.emit(Codes.TEXT, current_id, functionIndex.index)
      }

      if (has_if) {
        const functionIndex = functions.add(modifiers!.conditional!, vm.Payload.RESOLVE_NODE)

        emitter.emit(Codes.IF, current_id, functionIndex.index)
      }

      if (has_vm) {
        throw new Error(`Sorry this function is currently unavailable`)
      }

      if (has_for) {
        const iterate = modifiers!.iterate!

        const selectIndex = functions.add(iterate.select, vm.Payload.RESOLVE_NODE)
        const templateIndex = templates.add(compile(map(iterate.each)), resolve)

        emitter.emit(Codes.FOR, current_id, selectIndex.index, templateIndex.index)

        return
      }

      for (const child of current.children) {
        walk(child)
      }
    }

    walk(node)

    return {
      node,
      root: transform(node),
      nodes: nodes,
      strings: strings,
      bytecode: emitter.finish(),
      functions: functions,
      templates: templates,
      environment
    }
  }

  return {
    bind,
    compile
  }
}