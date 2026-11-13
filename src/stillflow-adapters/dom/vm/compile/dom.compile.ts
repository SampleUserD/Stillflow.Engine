import * as vm from "../../../../stillflow-vm/index.js"
import { Codes } from "../dom.codes.js"
import { AnyDOM } from "../dom.types.js"
import { Template } from "../dom.template.js"
import { transform } from "../transform/dom.transform.js"

export function compile<Context>(node: AnyDOM<Context>): Template {
  const emitter = new vm.Emitter()
  const strings = new vm.Payload()
  const functions = new vm.Payload()
  const templates = new vm.Payload()
  const nodes = new vm.Payload()

  let next_node_id = 0

  function walk(current: AnyDOM<any>) {
    const modifiers = current.properties.modifiers

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
        const propertyIndex = strings.add(key)
        const functionIndex = functions.add(properties[key])

        emitter.emit(Codes.PROPERTY, current_id, propertyIndex, functionIndex)
      }
    }

    if (has_events) {
      const events = modifiers!.events as any

      for (const name in events) {
        const eventIndex = strings.add(name)
        const functionIndex = functions.add(events[name])

        emitter.emit(Codes.EVENT, current_id, eventIndex, functionIndex)
      }
    }

    if (has_text) {
      const functionIndex = functions.add(modifiers!.text)
      emitter.emit(Codes.TEXT, current_id, functionIndex)
    }

    if (has_if) {
      const functionIndex = functions.add(modifiers!.conditional)
      emitter.emit(Codes.IF, current_id, functionIndex)
    }

    if (has_vm) {
      if (current.children.length > 1) {
        throw new Error(`Too much children for "sf:vm". Expected 1, but got ${node.children.length}`)
      }

      const selectIndex = functions.add(modifiers!.vm)
      const nodeIndex = nodes.add(current.children[0])

      emitter.emit(Codes.VM, current_id, selectIndex, nodeIndex)

      return
    }

    if (has_for) {
      const iterate = modifiers!.iterate!

      const selectIndex = functions.add(iterate.select)
      const subTemplate = compile(iterate.each())
      const templateIndex = templates.add(subTemplate)

      emitter.emit(Codes.FOR, current_id, selectIndex, templateIndex)

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
    nodes: nodes.values,
    strings: strings.values,
    bytecode: emitter.finish(),
    functions: functions.values,
    templates: templates.values
  }
}