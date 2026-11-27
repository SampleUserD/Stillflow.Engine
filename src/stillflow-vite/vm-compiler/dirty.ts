import { ExpressionNode } from "@/stillflow-vite/vm-compiler/nodes"

export interface DirtyContext {
  readonly variable_masks: Map<string, number>

  readonly tracked_variables: readonly string[]
}

export function create_dirty_context(variables: Iterable<string>): DirtyContext {
  const tracked_variables = Array.from(variables)

  if (tracked_variables.length > 31) {
    throw new Error(`Scope tracks ${tracked_variables.length} variables (max 313 for 32-bit SMI)`)
  }

  const variable_masks = new Map<string, number>()

  for (let index = 0; index < tracked_variables.length; index++) {
    variable_masks.set(tracked_variables[index], 1 << index)
  }

  return {
    variable_masks,
    tracked_variables
  }
}

export function compute_expression_mask(expression: ExpressionNode, context: DirtyContext): number {
  let mask = 0

  for (const ref of expression.refs) {
    const bit = context.variable_masks.get(ref)

    if (bit !== undefined) {
      mask |= bit
    }
  }

  return mask
}