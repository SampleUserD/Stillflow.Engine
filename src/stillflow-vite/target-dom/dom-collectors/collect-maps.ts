import { Compiled, Template, Transformed } from "@/stillflow-vite/vm-abstract"

export function collect_compile_map(root: Compiled): Map<Template, number> {
  const compile_map = new Map<Template, number>()

  function walk(current: Template): void {
    if (compile_map.has(current)) {
      return
    }

    compile_map.set(current, compile_map.size)

    for (const template of current.templates) {
      walk(template)
    }
  }

  walk(root)

  return compile_map
}

export function collect_transform_map(templates: Map<Template, number>): Map<Transformed, number> {
  const transform_map = new Map<Transformed, number>()

  for (const template of templates.keys()) {
    if (!transform_map.has(template.root)) {
      transform_map.set(template.root, transform_map.size)
    }
  }

  return transform_map
} 