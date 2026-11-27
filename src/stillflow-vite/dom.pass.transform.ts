import { Fabric } from "@/stillflow-vite/vm-compiler/fabric"
import { ExpressionNode, ForNode, StillflowNode, TextNode } from "@/stillflow-vite/vm-compiler/nodes"
import { Component } from "@/stillflow-vite/vm-abstract/vm.target"
import { types, generate, traverse } from "@babel/core"

export interface ComponentIR {
  readonly name: string
  readonly params: readonly string[]
  readonly body: StillflowNode
}

export interface TransformResult {
  readonly root: StillflowNode
  readonly components: Map<string, ComponentIR>
}

export function transform(node: types.Node, raw_components: Map<string, Component>): TransformResult {
  const RESERVED: Record<string, (statics: Record<string, string>, dynamics: Record<string, ExpressionNode>, children: StillflowNode[]) => StillflowNode> = {
    'for': transform_for
  }
  const DYNAMIC_TABLE: Record<string, string> = {
    'class': 'className'
  }

  const BUILTIN_GLOBALS = new Set([
    'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'JSON', 'Date', 'RegExp', 'Map', 'Set',
    'console', 'window', 'document', 'undefined', 'NaN', 'Infinity', 'isNaN', 'parseInt', 'parseFloat'
  ])

  function map_dynamic_property(name: string): string {
    if (name in DYNAMIC_TABLE) {
      return DYNAMIC_TABLE[name]
    }

    return name
  }

  function get_name(name: types.JSXNamespacedName | types.JSXIdentifier | types.JSXMemberExpression): string {
    if (types.isJSXNamespacedName(name)) {
      return `${name.namespace}:${name.name}`
    }

    if (types.isJSXIdentifier(name)) {
      return `${name.name}`
    }

    if (types.isJSXMemberExpression(name)) {
      return `${get_name(name.object)}.${name.property}`
    }
  }

  function visit(node: types.Node, env: Record<string, ExpressionNode> = {}): StillflowNode | null {
    if (types.isJSXText(node) || types.isJSXExpressionContainer(node)) {
      return transform_text(node, env)
    }

    if (types.isJSXElement(node)) {
      return transform_element(node, env)
    }

    throw new Error(`Undefined node ${node.type} at ${node.loc.filename} ${node.loc.start.line}:${node.loc.start.column}`)
  }

  function transform_expression(node: types.JSXExpressionContainer, env: Record<string, ExpressionNode>): ExpressionNode {
    const refs = new Set<string>()
    const expression = node.expression

    if (types.isJSXEmptyExpression(expression)) {
      throw new Error(`We do not support JSX empty expressions at ${expression.loc.filename} ${expression.loc.start.line}:${expression.loc.start.column}`)
    }

    const wrapper = types.file(
      types.program([
        types.expressionStatement(expression)
      ])
    )

    traverse(wrapper, {
      Identifier(path) {
        if (!path.isReferencedIdentifier()) {
          return
        }

        const name = path.node.name

        if (BUILTIN_GLOBALS.has(name)) {
          return
        }

        if (path.scope.hasBinding(name)) {
          return
        }

        if (name in env) {
          for (const ref of env[name].refs) {
            refs.add(ref)
          }
        } else {
          refs.add(name)
        }
      }
    })

    let code = generate(expression).code

    return Fabric.expression(code, Array.from(refs))
  }

  function transform_text(node: types.JSXText | types.JSXExpressionContainer, env: Record<string, ExpressionNode>): TextNode {
    if (types.isJSXText(node)) {
      const value = node.value.trim()

      if (value !== String()) {
        return Fabric.text(node.value.trim())
      }
    }

    if (types.isJSXExpressionContainer(node)) {
      return Fabric.text(transform_expression(node, env))
    }

    return null
  }

  function transform_if(_: Record<string, string>, dynamics: Record<string, ExpressionNode>, children: StillflowNode[]) {

  }

  function transform_for(_: Record<string, string>, dynamics: Record<string, ExpressionNode>, children: StillflowNode[]): ForNode {
    if ('select' in dynamics === false) {
      throw new Error(`For expression should contain select attribute`)
    }

    if (children.length < 1) {
      throw new Error(`For should have at least one child`)
    }

    const select = dynamics['select']

    return Fabric.for(select, '$it', '$index', children)
  }

  function transform_element(node: types.JSXElement, env: Record<string, ExpressionNode>): StillflowNode {
    const statics: Record<string, string> = {}
    const dynamics: Record<string, ExpressionNode> = {}
    const children: StillflowNode[] = []

    const tag = get_name(node.openingElement.name)
    const attributes = node.openingElement.attributes

    for (const attribute of attributes) {
      if (!types.isJSXAttribute(attribute)) {
        throw new Error(`We do not support spread attributes at ${attribute.loc.filename} ${attribute.loc.start.line}:${attribute.loc.start.column}`)
      }

      const name = get_name(attribute.name)
      const value = attribute.value

      if (!value) {
        throw new Error(`We do not support empty attribute values at ${attribute.loc.filename} ${attribute.loc.start.line}:${attribute.loc.start.column}`)
      }

      if (types.isStringLiteral(value)) {
        statics[name] = value.value
      }

      if (types.isJSXExpressionContainer(value)) {
        dynamics[map_dynamic_property(name)] = transform_expression(value, env)
      }

      if (types.isJSXElement(value) || types.isJSXFragment(value)) {
        throw new Error(`We do not support attribute values such as JSXElement or JSXFragment at ${attribute.loc.filename} ${attribute.loc.start.line}:${attribute.loc.start.column}`)
      }
    }

    for (const child of node.children) {
      const transformed_child = visit(child, env)

      if (transformed_child !== null) {
        children.push(transformed_child)
      }
    }

    if (tag in RESERVED) {
      return RESERVED[tag](statics, dynamics, children)
    }

    if (raw_components.has(tag)) {
      return Fabric.call(tag, dynamics)
    }

    return Fabric.element(tag, statics, dynamics, children)
  }

  const root = visit(node)!
  const components = new Map<string, ComponentIR>()

  for (const [name, component] of raw_components) {
    components.set(name, {
      name,
      params: component.parameters.map(p => p.name),
      body: visit(component.body)!
    })
  }

  return { root, components }
}