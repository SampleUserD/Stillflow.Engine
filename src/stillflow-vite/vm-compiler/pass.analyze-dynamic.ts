import { AnalysisMeta, StillflowNode } from "@/stillflow-vite/vm-compiler/nodes"

export function analyze_tree(node: StillflowNode): AnalysisMeta {
  switch (node.kind) {
    case 'Expression': {
      node.meta.analysis = {
        is_dynamic: true,
        dirty_mask: 0,
        has_child_chunks: false
      }

      return node.meta.analysis
    }

    case 'Text': {
      node.meta.analysis = {
        is_dynamic: node.is_dynamic,
        dirty_mask: 0,
        has_child_chunks: false
      }

      return node.meta.analysis
    }

    case 'Element': {
      const child_results = node.children.map(analyze_tree)

      const has_dynamic_props = Object.keys(node.dynamic_properties).length > 0
      const has_dynamic_child = child_results.some(r => r.is_dynamic)
      const has_child_chunks = child_results.some(r => r.has_child_chunks)

      node.meta.analysis = {
        is_dynamic: has_dynamic_props || has_dynamic_child || has_child_chunks,
        dirty_mask: 0,
        has_child_chunks
      }

      return node.meta.analysis
    }

    case 'For': {
      analyze_tree(node.select)

      for (const child of node.body) {
        analyze_tree(child)
      }

      node.meta.analysis = {
        is_dynamic: true,
        dirty_mask: 0,
        has_child_chunks: true
      }

      return node.meta.analysis
    }

    case 'Call': {
      node.meta.analysis = {
        is_dynamic: true,
        dirty_mask: 0,
        has_child_chunks: true
      }

      return node.meta.analysis
    }
  }
}