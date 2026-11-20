import type { BindingDOM, DirectivesDOM, PropertiesDOM } from "@/stillflow-vite/target-dom/dom.binding"
import type { Toolkit, Component } from "@/stillflow-vite/vm-abstract"

import { extract_attributes, extract_children } from "@/stillflow-vite/vm-jsx-helpers/extract-buildtime"
import { get_target_and_tag } from "@/stillflow-vite/vm-jsx-helpers/get-target-and-tag"
import { replace_properties } from "@/stillflow-vite/vm-jsx-helpers/replace-properties"
import { build_url } from "@/stillflow-vite/vm-jsx-helpers/url-builder"

import { types } from "@babel/core"

const DYNAMIC_PROPERTY_CONDITIONAL_MAP = 'conditional'

const DYNAMIC_PROPERTY_PREFIX = `sf:`
const DYNAMIC_PROPERTY_SWITCH = `${DYNAMIC_PROPERTY_PREFIX}vm`
const DYNAMIC_PROPERTY_CYCLES = [`${DYNAMIC_PROPERTY_PREFIX}for`, `${DYNAMIC_PROPERTY_PREFIX}each`]
const DYNAMIC_PROPERTY_CONDITIONAL = `${DYNAMIC_PROPERTY_PREFIX}if`
const DELEGATE_EVENT_PROPERTY_PREFIX = `${DYNAMIC_PROPERTY_PREFIX}on-`
const COMMON_EVENT_PROPERTY_PREFIX = `on:`
const COMMON_STYLES_PROPERTY = 'style:'

function patch(record: Record<string, any>, key: string, value: any) {
  record[key] = value
}

export class BindingBuilder {
  private static _inlines = new WeakMap<Component, BindingDOM>()

  private static inline(component: Component, toolkit: Toolkit, properties: Record<string, types.Node>): BindingDOM {
    const body = types.cloneNode(component.body, true)

    const name = component.parameters[0]?.name

    if (name !== undefined) {
      return this.build(replace_properties(body, properties, name!), toolkit)
    }

    return this.build(body, toolkit)
  }

  public static build(node: types.JSXElement, toolkit: Toolkit, path: number[] = []): BindingDOM {
    const [_, tag] = get_target_and_tag(node)
    const component = toolkit.context.components.get(tag)
    const raw_properties = extract_attributes(node)

    if (component !== undefined) {
      const url = build_url(path, tag)

      if (toolkit.recursion.is_recursive(url)) {
        const inline = this._inlines.get(component)

        if (inline !== undefined) {
          inline.properties.recursive = inline
          return inline
        }
      }

      const result = this.inline(component, toolkit, raw_properties)

      this._inlines.set(component, result)

      return result
    }

    const directives: DirectivesDOM = {}
    const properties: PropertiesDOM = {}

    const { children, content } = extract_children(node)
    const { statics, dynamics } = content

    const dom: BindingDOM[] = []

    for (const key in raw_properties) {
      const value = raw_properties[key]

      if (key.startsWith(COMMON_EVENT_PROPERTY_PREFIX)) {
        properties.events = properties.events || {}
        patch(properties.events, key.slice(COMMON_EVENT_PROPERTY_PREFIX.length), raw_properties[key])
      } else if (key.startsWith(DELEGATE_EVENT_PROPERTY_PREFIX)) {
        directives.delegate = directives.delegate || {}
        patch(directives.delegate, key.slice(DELEGATE_EVENT_PROPERTY_PREFIX.length), raw_properties[key])
      } else if (key === DYNAMIC_PROPERTY_CONDITIONAL) {
        patch(directives, DYNAMIC_PROPERTY_CONDITIONAL_MAP, raw_properties[key])
      } else if (DYNAMIC_PROPERTY_CYCLES.includes(key)) {
        directives.iterator = {
          select: raw_properties[DYNAMIC_PROPERTY_CYCLES[0]] as types.Expression,
          each: raw_properties[DYNAMIC_PROPERTY_CYCLES[1]] as types.Expression
        }
      } else if (key === DYNAMIC_PROPERTY_SWITCH) {
        patch(directives, DYNAMIC_PROPERTY_SWITCH.slice(DYNAMIC_PROPERTY_PREFIX.length), raw_properties[key])
      } else if (key.startsWith(DYNAMIC_PROPERTY_PREFIX)) {
        directives.properties = directives.properties || {}
        patch(directives.properties, key.slice(DYNAMIC_PROPERTY_PREFIX.length), raw_properties[key])
      } else if (types.isStringLiteral(value)) {
        if (key.startsWith(COMMON_STYLES_PROPERTY)) {
          properties.styles = properties.styles || {}
          patch(properties.styles, key.slice(COMMON_STYLES_PROPERTY.length), value.value)
        } else {
          properties.properties = properties.properties || {}
          patch(properties.properties, key, value.value)
        }
      }
    }

    if (statics.length > 0) {
      let static_expression: types.Expression = statics[0]

      for (let index = 1; index < statics.length; index++) {
        static_expression = types.binaryExpression('+', static_expression, statics[index])
      }

      properties.text = static_expression
    }

    if (dynamics.length > 0) {
      let dynamic_expression: types.Expression = types.callExpression(dynamics[0], [types.identifier('context')])

      for (let index = 1; index < dynamics.length; index++) {
        const dynamic = dynamics[index]

        dynamic_expression = types.binaryExpression('+', dynamic_expression, types.callExpression(dynamic, [types.identifier('context')]))
      }

      directives.dynamic_text = types.functionExpression(
        null,
        [types.identifier('context')],
        types.blockStatement([
          types.returnStatement(dynamic_expression)
        ])
      )
    }

    if (children.length > 0) {
      for (let index = 0; index < children.length; index++) {
        dom.push(this.build(children[index], toolkit, [...path, index]))
      }
    }

    properties.tag = tag
    properties.directives = directives

    return {
      children: dom,
      properties
    }
  }
}