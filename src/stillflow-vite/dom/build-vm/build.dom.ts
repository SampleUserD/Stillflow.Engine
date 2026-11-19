import { Binding } from "@/stillflow-vite/babel-vm"
import { ComponentInformation, Environment } from "@/stillflow-vite/dom/environment"
import { extract_attributes, extract_children } from "@/stillflow-vite/dom/helpers/extractors"
import { get_tag_name_without_jsxdom } from "@/stillflow-vite/dom/helpers/getters"
import { replace_properties } from "@/stillflow-vite/dom/helpers/replacers"
import { Directives } from "@/stillflow-vite/dom/properties/directives"
import { Properties } from "@/stillflow-vite/dom/properties/properties"
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

export type BuildTimeDOMElement = Binding<Properties<any, any> & Partial<{ recursive: BuildTimeDOMElement }>>

function inline(component: ComponentInformation, properties: Record<string, types.Node>, state: Environment): BuildTimeDOMElement {
  const body = types.cloneNode(component.body, true)

  const name = component.parameters[0]?.name

  if (name !== undefined) {
    return build_dom_from(replace_properties(body, properties, name!), state)
  }

  return build_dom_from(body, state)
}

const inlined = new WeakMap<ComponentInformation, BuildTimeDOMElement>()

export function build_dom_from(node: types.JSXElement, state: Environment, path: number[] = []): BuildTimeDOMElement {
  const tag_name = get_tag_name_without_jsxdom(node)
  const component = state.components.get(tag_name)

  const { properties } = extract_attributes(node.openingElement)

  if (component !== undefined) {
    const url = path.join(':')

    if (state.expanding.has(`${url}-${tag_name}`)) {
      const inline = inlined.get(component)

      if (inline !== undefined) {
        inline.properties.recursive = inline

        return inline
      }
    }

    const result = inline(component, properties, state)

    inlined.set(component, result)

    return result
  }

  const directives: Directives<any> = {}
  const common_properties: Properties<any, any> = {}

  const { children, content } = extract_children(node)
  const { statics, dynamics } = content

  const dom: BuildTimeDOMElement[] = []

  for (const key in properties) {
    const value = properties[key]

    if (key.startsWith(COMMON_EVENT_PROPERTY_PREFIX)) {
      common_properties.events = common_properties.events || {}
      patch(common_properties.events, key.slice(COMMON_EVENT_PROPERTY_PREFIX.length), properties[key])
    } else if (key.startsWith(DELEGATE_EVENT_PROPERTY_PREFIX)) {
      directives.events = directives.events || {}
      patch(directives.events, key.slice(DELEGATE_EVENT_PROPERTY_PREFIX.length), properties[key])
    } else if (key === DYNAMIC_PROPERTY_CONDITIONAL) {
      patch(directives, DYNAMIC_PROPERTY_CONDITIONAL_MAP, properties[key])
    } else if (DYNAMIC_PROPERTY_CYCLES.includes(key)) {
      directives.iterate = {
        select: properties[DYNAMIC_PROPERTY_CYCLES[0]],
        each: properties[DYNAMIC_PROPERTY_CYCLES[1]]
      }
    } else if (key === DYNAMIC_PROPERTY_SWITCH) {
      patch(directives, DYNAMIC_PROPERTY_SWITCH.slice(DYNAMIC_PROPERTY_PREFIX.length), properties[key])
    } else if (key.startsWith(DYNAMIC_PROPERTY_PREFIX)) {
      directives.properties = directives.properties || {}
      patch(directives.properties, key.slice(DYNAMIC_PROPERTY_PREFIX.length), properties[key])
    } else if (types.isStringLiteral(value)) {
      if (key.startsWith(COMMON_STYLES_PROPERTY)) {
        common_properties.styles = common_properties.styles || {}
        patch(common_properties.styles, key.slice(COMMON_STYLES_PROPERTY.length), value.value)
      } else {
        common_properties.properties = common_properties.properties || {}
        patch(common_properties.properties, key, value.value)
      }
    }
  }

  if (statics.length > 0) {
    let static_expression: types.Expression = statics[0]

    for (let index = 1; index < statics.length; index++) {
      static_expression = types.binaryExpression('+', static_expression, statics[index])
    }

    common_properties.text = static_expression
  }

  if (dynamics.length > 0) {
    let dynamic_expression: types.Expression = types.callExpression(dynamics[0], [types.identifier('context')])

    for (let index = 1; index < dynamics.length; index++) {
      const dynamic = dynamics[index]

      dynamic_expression = types.binaryExpression('+', dynamic_expression, types.callExpression(dynamic, [types.identifier('context')]))
    }

    directives.text = types.functionExpression(
      null,
      [types.identifier('context')],
      types.blockStatement([
        types.returnStatement(dynamic_expression)
      ])
    )
  }

  if (children.length > 0) {
    for (let index = 0; index < children.length; index++) {
      dom.push(build_dom_from(children[index], state, [...path, index]))
    }
  }

  common_properties.name = tag_name
  common_properties.modifiers = directives

  return {
    children: dom,
    properties: common_properties
  }
}