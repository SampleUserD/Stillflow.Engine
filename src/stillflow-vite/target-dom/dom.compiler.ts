import { get_return_argument } from "@/stillflow-vite/vm-jsx-helpers/get-return-argument"
import { get_target_and_tag } from "@/stillflow-vite/vm-jsx-helpers/get-target-and-tag"
import { build_url } from "@/stillflow-vite/vm-jsx-helpers/url-builder"
import { collect_compile_map, collect_transform_map } from "@/stillflow-vite/target-dom/dom-collectors/collect-maps"

import { BindingDOM } from "@/stillflow-vite/target-dom/dom.binding"
import { BindingBuilder } from "@/stillflow-vite/target-dom/dom.build-binding"
import { CodesDOM } from "@/stillflow-vite/target-dom/dom.codes"
import { Transformer } from "@/stillflow-vite/target-dom/dom.transformer"
import { Compiled, Toolkit, pack_opcode } from "@/stillflow-vite/vm-abstract"

import { Emitter } from "@/stillflow-vite/vm-instruments"

import { types } from "@babel/core"
import { markup } from "@/stillflow-vite/target-dom/dom.markup"

export interface CompilerResult extends Compiled {
  node: BindingDOM,
  nodes: BindingDOM[]
}

export class Compiler {
  private static _cache = new WeakMap<BindingDOM, CompilerResult>()
  private _emitter = new Emitter()

  private _nodes: BindingDOM[] = []
  private _strings: string[] = []
  private _functions: types.Expression[] = []
  private _templates: CompilerResult[] = []

  private _counter: number = 0

  public constructor(private _toolkit: Toolkit) { }

  private compile_current(current: BindingDOM, path: number[] = []) {
    const { directives } = current.properties
    const toolkit = this._toolkit

    const has_properties = directives?.properties !== undefined
    const has_events = directives?.delegate !== undefined
    const has_text = directives?.dynamic_text !== undefined
    const has_for = directives?.iterator !== undefined
    const has_if = directives?.conditional !== undefined

    let current_id = -1

    if (has_properties || has_events || has_text || has_if || has_for) {
      current_id = this._counter++
    }

    if (has_properties) {
      const properties = directives!.properties!

      for (const key in properties) {
        const property_id = this._strings.push(key) - 1
        const function_id = this._functions.push(properties[key]) - 1

        this._emitter.emit(pack_opcode(toolkit.target, CodesDOM.PROPERTY), current_id, property_id, function_id)
      }
    }

    if (has_events) {
      const events = directives!.delegate!

      for (const key in events) {
        const property_id = this._strings.push(key) - 1
        const event_id = this._functions.push(events[key]) - 1

        this._emitter.emit(pack_opcode(toolkit.target, CodesDOM.EVENT), current_id, property_id, event_id)
      }
    }

    if (has_text) {
      const function_id = this._functions.push(directives!.dynamic_text!) - 1

      this._emitter.emit(pack_opcode(toolkit.target, CodesDOM.TEXT), current_id, function_id)
    }

    if (has_if) {
      const function_id = this._functions.push(directives!.conditional!) - 1

      this._emitter.emit(pack_opcode(toolkit.target, CodesDOM.IF), current_id, function_id)
    }

    if (has_for) {
      const iterator = directives!.iterator!

      const select = iterator.select
      const each = get_return_argument(iterator.each as types.ArrowFunctionExpression) as types.JSXElement

      if (!types.isJSXElement(each)) {
        throw new Error(`sf:each must return jsx element`)
      }

      const [_, tag] = get_target_and_tag(each)
      const url = build_url(path, tag)

      toolkit.recursion.push(url)

      const element = BindingBuilder.build(each, toolkit, path)

      toolkit.recursion.pop(url)

      const select_id = this._functions.push(select) - 1
      const node_id = this._nodes.push(element) - 1

      const previous_emitter = this._emitter
      this._emitter = new Emitter()

      const template_id = this._templates.push(this.compile(element)) - 1

      this._emitter = previous_emitter

      this._emitter.emit(pack_opcode(toolkit.target, CodesDOM.FOR), current_id, select_id, template_id, node_id)

      return
    }

    for (let index = 0; index < current.children.length; index++) {
      this.compile_current(current.children[index], [...path, index])
    }
  }

  public compile(node: BindingDOM): CompilerResult {
    this._counter = 0

    if (Compiler._cache.has(node)) {
      return Compiler._cache.get(node)!
    }

    const template: CompilerResult = {
      node,
      root: Transformer.transform(node, this._toolkit),
      nodes: this._nodes,
      strings: this._strings,
      functions: this._functions,
      templates: this._templates,
      bytecode: this._emitter.finish(),
      markup: markup(node),
      compile_map: new Map(),
      transform_map: new Map()
    }

    Compiler._cache.set(node, template)

    this.compile_current(node)

    template.bytecode = this._emitter.finish()
    template.compile_map = collect_compile_map(template)
    template.transform_map = collect_transform_map(template.compile_map)

    return template
  }
}