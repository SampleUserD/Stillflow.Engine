import { StillflowNode } from "@/stillflow-vite/vm-compiler"
import { DirtyContext, compute_expression_mask, create_dirty_context } from "@/stillflow-vite/vm-compiler/dirty"

export function analyze_dirty(node: StillflowNode, dirty: DirtyContext): number {
  switch (node.kind) {
    case "Expression": {
      node.meta.analysis.dirty_mask = compute_expression_mask(node, dirty)

      return node.meta.analysis.dirty_mask
    }
    case "Text": {
      if (typeof node.value !== 'string') {
        const mask = analyze_dirty(node.value, dirty)

        node.meta.analysis.dirty_mask = mask
      }

      node.meta.analysis.dirty_mask = 0

      return node.meta.analysis.dirty_mask
    }
    case "Element": {
      let dirty_mask = 0

      for (const [key, expression] of Object.entries(node.dynamic_properties)) {
        const property_mask = analyze_dirty(expression, dirty)

        node.dynamic_properties_mask[key] = property_mask

        dirty_mask |= property_mask
      }

      for (const child of node.children) {
        dirty_mask |= analyze_dirty(child, dirty)
      }

      node.meta.analysis.dirty_mask = dirty_mask

      return dirty_mask
    }
    case "For": {
      let outer_mask = analyze_dirty(node.select, dirty)

      const inner_dirty = create_dirty_context(['$it', ...node.meta.scope.captures])

      node.dirty_context = inner_dirty

      for (const child of node.body) {
        analyze_dirty(child, inner_dirty)
      }

      for (const capture of node.meta.scope.captures) {
        const bit = dirty.variable_masks.get(capture)

        if (bit !== undefined) {
          outer_mask |= bit
        }
      }

      node.meta.analysis.dirty_mask = outer_mask

      return outer_mask
    }
    case "Call": {
      let dirty_mask = 0

      for (const expression of Object.values(node.properties)) {
        dirty_mask |= analyze_dirty(expression, dirty)
      }

      const it_bit = dirty.variable_masks.get('$it')

      if (it_bit !== undefined) {
        dirty_mask |= it_bit
      }

      node.meta.analysis.dirty_mask = dirty_mask

      return dirty_mask
    }
  }
}