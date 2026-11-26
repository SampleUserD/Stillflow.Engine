import { choice, iterate, local } from "@/stillflow-vite/vm-compiler/vmc.combinators"
import { get_full_name } from "@/stillflow-vite/vm-jsx-helpers/get-full-name"
import { get_target_and_tag } from "@/stillflow-vite/vm-jsx-helpers/get-target-and-tag"

import { CodesDOM } from "@/stillflow-vite/target-dom/dom.codes"
import { Component } from "@/stillflow-vite/vm-abstract"
import { VMCError, VMCResult, VMCTransform } from "@/stillflow-vite/vm-compiler/vmc.transform"
import { DOMElement, DOMDynamicText, DOMStaticText } from "@/stillflow-vite/target-dom/dom-semantics"
import { StillflowFor, StillflowIdentifier, StillflowMember, StillflowNode, StillflowScope, StillflowSequence, StillflowString } from "@/stillflow-vite/vm-semantics"

import { types } from "@babel/core"
import { DOMDynamicProperty, DOMProperty, DOMStaticProperty } from "@/stillflow-vite/target-dom/dom-semantics/node.property"

interface BuldingContext {
  components: Map<string, Component>,
  parent: StillflowNode | null,
  stack: Set<Component>,
}

type BuildingResult = VMCResult<types.Node, StillflowNode, BuldingContext>

type Builder = VMCTransform<types.Node, StillflowNode, BuldingContext, BuldingContext>

const prefix = (prefix: string) => (value: StillflowNode, name: string) => [name.startsWith(prefix), name.slice(prefix.length)] as [boolean, string]
const dynamic = () => (value: StillflowMember, name: string) => [value.root.is('$it'), name] as [boolean, string]
const any = (value: StillflowMember, name: string) => [true, name] as [boolean, string]

const RESERVED_COMPONENTS: Record<string, Builder> = {
  'for': build_for
}

const BUILDERS: Partial<{ [K in keyof typeof types.VISITOR_KEYS]: Builder }> = {
  JSXText: build_text,
  JSXElement: build_element,
  JSXExpressionContainer: build_expression
}

function build_identifier(node: types.Node, context: BuldingContext): BuildingResult {
  if (!types.isIdentifier(node)) {
    return {
      ok: false,
      error: [{
        message: `Expected identifier`,
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  return {
    ok: true,
    value: new StillflowIdentifier(node.name),
    rest: node,
    ctx: context
  }
}

function build_member(node: types.Node, context: BuldingContext): BuildingResult {
  if (!types.isMemberExpression(node)) {
    return {
      ok: false,
      error: [{
        message: 'Expected member expression',
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  const object_builder = choice(build_member, build_identifier)
  const member_builder = build_identifier

  const object_result = object_builder(node.object, context)
  const member_result = member_builder(node.property, context)

  if (object_result.ok === false) {
    return {
      ok: false,
      error: object_result.error
    }
  }

  if (member_result.ok === false) {
    return {
      ok: false,
      error: member_result.error
    }
  }

  return {
    ok: true,
    value: new StillflowMember(object_result.value as StillflowIdentifier | StillflowMember, member_result.value as StillflowIdentifier),
    rest: node,
    ctx: context
  }
}

function build_expression(node: types.Node, context: BuldingContext): BuildingResult {
  if (types.isStringLiteral(node)) {
    return {
      ok: true,
      value: new StillflowString(node.value),
      rest: node,
      ctx: context
    }
  }

  if (!types.isJSXExpressionContainer(node)) {
    return {
      ok: false,
      error: [{
        message: `Expected container`,
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  const expression = node.expression

  if (types.isJSXEmptyExpression(expression)) {
    return {
      ok: false,
      error: [{
        message: `Does not support JSX empty expression`,
        position: [expression.loc.start.line, expression.loc.start.column]
      }]
    }
  }

  const alt = choice(
    build_element,
    choice(
      build_member,
      build_identifier
    )
  )

  return alt(expression, context)
}

function build_for(node: types.Node, context: BuldingContext): BuildingResult {
  if (!types.isJSXElement(node)) {
    return {
      ok: false,
      error: [{
        message: `Expected JSX element`,
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  const properties = build_properties(node, context)

  if (properties.ok === false) {
    return {
      ok: false,
      error: properties.error
    }
  }

  const attributes = properties.value

  if ('each' in attributes === false) {
    return {
      ok: false,
      error: [{ message: `Expected attribute each on sf.for`, position: [node.loc.start.line, node.loc.start.column] }]
    }
  }

  const children_resolver = iterate(
    choice(
      build_element,
      choice(
        build_text,
        build_expression
      )
    )
  )

  const parent_children: StillflowNode[] = []

  const parent = new StillflowFor(
    context.parent,
    attributes.each.value,
    new StillflowSequence(parent_children)
  )

  const children = children_resolver(node.children, { ...context, parent })

  if (children.ok === false) {
    return {
      ok: false,
      error: children.error
    }
  }

  if (children.value.length <= 0) {
    return {
      ok: false,
      error: [{ message: `For should have at least one child`, position: [node.loc.start.line, node.loc.start.column] }]
    }
  }

  parent_children.push(...children.value)

  return {
    ok: true,
    value: parent,
    rest: node,
    ctx: context
  }
}

function build_component(node: types.Node, component: Component, context: BuldingContext): BuildingResult {
  const body = types.cloneNode(component.body, true)

  const properties = build_properties(node, context)

  if (properties.ok === false) {
    return {
      ok: false,
      error: properties.error
    }
  }

  const element = build_element(body, { ...context, stack: new Set([...context.stack, component]) })

  if (element.ok === false) {
    return {
      ok: false,
      error: element.error
    }
  }

  return {
    ok: true,
    value: element.value,
    rest: node,
    ctx: context
  }
}

function build_element(node: types.Node, context: BuldingContext): BuildingResult {
  if (!types.isJSXElement(node)) {
    return {
      ok: false,
      error: [{
        message: `Expected JSX element`,
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  const [target, tag] = get_target_and_tag(node)
  const component = context.components.get(tag)

  if (tag in RESERVED_COMPONENTS) {
    return RESERVED_COMPONENTS[tag](node, context)
  }

  if (context.stack.has(component)) {
    return {
      ok: false,
      error: [{
        message: `Recursive component in file ${component.filename}`,
        position: [component.body.loc.start.line, component.body.loc.start.column]
      }]
    }
  }

  if (component !== undefined) {
    return build_component(node, component, context)
  }

  const children: StillflowNode[] = []
  const attributes = {}

  const element = new DOMElement(tag, attributes, children)

  const writer = (context: BuldingContext) => ({ ...context, parent: element })

  const attribute_resolver = local(writer, build_properties)
  const children_resolver = local(
    writer,
    iterate(
      choice(
        build_element,
        choice(
          build_text,
          build_expression
        )
      )
    )
  )

  const resolved_attributes = attribute_resolver(node, context)
  const resolved_children = children_resolver(node.children, context)

  if (resolved_attributes.ok === false) {
    return {
      ok: false,
      error: resolved_attributes.error
    }
  }

  if (resolved_children.ok === false) {
    return {
      ok: false,
      error: resolved_children.error
    }
  }

  Object.assign(attributes, resolved_attributes.value)
  children.push(...resolved_children.value)

  return {
    ok: true,
    value: new StillflowScope([element]),
    rest: node,
    ctx: context
  }
}

function build_properties(node: types.Node, context: BuldingContext): VMCResult<typeof node, Record<string, DOMProperty>, typeof context> {
  if (!types.isJSXElement(node)) {
    return {
      ok: false,
      error: [{
        message: `Expected JSX element`,
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  const attributes: Record<string, DOMProperty> = {}
  const errors: VMCError[] = []

  const alt = choice(
    build_property(prefix('sf-on:'), CodesDOM.SET_LIST_EVENT),
    choice(
      build_property(dynamic(), CodesDOM.SET_PROPERTY),
      choice(
        build_property(prefix('on:'), CodesDOM.SET_STATIC_EVENT),
        build_property(any, CodesDOM.SET_ATTRIBUTE)
      )
    )
  )

  for (const attribute of node.openingElement.attributes) {
    if (!types.isJSXAttribute(attribute)) {
      errors.push({ message: `Expected JSX attribute`, position: [attribute.loc.start.line, attribute.loc.start.column] })

      continue
    }

    const alternatives = alt(attribute, context)

    if (alternatives.ok === false) {
      errors.push(...alternatives.error)

      continue
    }

    const [opcode, name, expression] = alternatives.value

    switch (opcode) {
      case CodesDOM.SET_STATIC_EVENT:
      case CodesDOM.SET_ATTRIBUTE:
        attributes[name] = new DOMStaticProperty(opcode, name, expression as StillflowString)
        break
      case CodesDOM.SET_LIST_EVENT:
      case CodesDOM.SET_PROPERTY:
        attributes[name] = new DOMDynamicProperty(opcode, name, expression)
      default:
        errors.push({ message: `Undefined attribute ${name}`, position: [attribute.loc.start.line, attribute.loc.start.column] })
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      error: errors
    }
  }

  return {
    ok: true,
    value: attributes,
    rest: node,
    ctx: context
  }
}

function build_property(predicate: (value: StillflowNode, name: string) => [boolean, string], opcode: CodesDOM) {
  return function build(node: types.JSXAttribute, context: BuldingContext): VMCResult<types.JSXAttribute, [CodesDOM, string, StillflowNode], BuldingContext> {
    const name = get_full_name(node.name)
    const value = build_expression(node.value, context)

    if (value.ok === false) {
      return {
        ok: false,
        error: [{ message: `Failed to parse attribute ${name}`, position: [node.loc.start.line, node.loc.start.column] }, ...value.error]
      }
    }

    const result = predicate(value.value, name)

    if (!result[0]) {
      return {
        ok: false,
        error: [{ message: `Expected attribute`, position: [node.loc.start.line, node.loc.start.column] }]
      }
    }

    return {
      ok: true,
      value: [opcode, result[1], value.value],
      rest: node,
      ctx: context
    }
  }
}

function build_text(node: types.Node, context: BuldingContext): BuildingResult {
  if (types.isJSXText(node)) {
    return {
      ok: true,
      value: new DOMStaticText(node.value.trim()),
      rest: node,
      ctx: context
    }
  }

  if (types.isJSXExpressionContainer(node)) {
    const expression = build_expression(node, context)

    if (expression.ok === false) {
      return {
        ok: false,
        error: expression.error
      }
    }

    return {
      ok: true,
      value: new DOMDynamicText(expression.value),
      rest: expression.rest,
      ctx: context
    }
  }

  return {
    ok: false,
    error: [{ message: `Expected text or expression container`, position: [node.loc.start.line, node.loc.start.column] }]
  }
}

export function create_context(components: BuldingContext['components']): BuldingContext {
  return {
    parent: null,
    components,
    stack: new Set()
  }
}

export function build(node: types.Node, context: BuldingContext): BuildingResult {
  const builder = BUILDERS[node.type]

  if (builder === undefined) {
    return {
      ok: false,
      error: [{
        message: `Cannot build JSX-node of ${node.type} - is not supported`,
        position: [node.loc.start.line, node.loc.start.column]
      }]
    }
  }

  return builder(node, context)
}
