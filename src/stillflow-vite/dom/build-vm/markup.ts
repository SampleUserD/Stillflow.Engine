import { BuildTimeDOMElement } from "@/stillflow-vite/dom/build-vm/build.dom"
import { types } from "@babel/core"

export interface MarkupResult {
  parameters: types.Identifier[],
  body: types.Statement[]
}

interface TraversalContext {
  counter: number,
  declarations: types.VariableDeclarator[],
  node_cache: types.Expression[],
  text_cache: types.Expression[]
}

function traverse_template(node: BuildTimeDOMElement, current: types.Expression, context: TraversalContext): boolean {
  const { modifiers } = node.properties

  const has_modifiers = Object.keys(modifiers).length > 0

  function subtree_has_modifiers(element: BuildTimeDOMElement): boolean {
    if (Object.keys(element.properties.modifiers || {}).length > 0) {
      return true
    }

    return element.children.some(subtree_has_modifiers)
  }

  let has_active_descendants = node.children.some(subtree_has_modifiers)
  let is_matched = has_active_descendants || has_modifiers

  if (!is_matched) {
    return false
  }

  let node_identificator = current

  if (!types.isIdentifier(current)) {
    const id = types.identifier(`n${context.counter++}`)

    context.declarations.push(types.variableDeclarator(id, current))

    node_identificator = id
  }

  if (has_modifiers) {
    context.node_cache.push(node_identificator)

    context.text_cache.push(types.memberExpression(node_identificator, types.identifier('firstChild')))
  }

  if (has_active_descendants && node.children.length > 0) {
    let previous: types.Expression = types.memberExpression(node_identificator, types.identifier('firstElementChild'))

    for (let index = 0; index < node.children.length; index++) {
      const child = node.children[index]
      const child_is_needed = subtree_has_modifiers(child)

      if (index > 0) {
        if (!types.isIdentifier(previous)) {
          const step_id = types.identifier(`n${context.counter++}`)

          context.declarations.push(types.variableDeclarator(step_id, previous))

          previous = step_id
        }

        previous = types.memberExpression(previous, types.identifier('nextElementSibling'))
      }

      if (child_is_needed) {
        const before_count = context.declarations.length

        traverse_template(child, previous, context)

        if (context.declarations.length > before_count) {
          previous = context.declarations[before_count].id as types.Identifier
        }
      }
    }
  }

  return true
}

export function markup(node: BuildTimeDOMElement): MarkupResult {
  const context: TraversalContext = {
    counter: 0,
    declarations: [],
    node_cache: [],
    text_cache: []
  }

  const root_identifier = types.identifier('root')

  traverse_template(node, root_identifier, context)

  const body: types.Statement[] = []

  if (context.declarations.length > 0) {
    body.push(types.variableDeclaration('const', context.declarations))
  }

  body.push(
    types.variableDeclaration('const', [
      types.variableDeclarator(types.identifier('sf_node_cache'), types.arrayExpression(context.node_cache)),
      types.variableDeclarator(types.identifier('sf_text_cache'), types.arrayExpression(context.text_cache))
    ])
  )

  return {
    parameters: [root_identifier],
    body
  }
}
