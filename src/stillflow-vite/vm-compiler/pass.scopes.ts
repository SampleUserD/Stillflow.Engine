import { StillflowNode } from "@/stillflow-vite/vm-compiler/nodes"

export class SymbolScope {
  private _locals = new Set<string>()

  public constructor(public readonly parent: SymbolScope | null = null) { }

  public declare(name: string): void {
    this._locals.add(name)
  }

  public is_captured(name: string): boolean {
    if (this._locals.has(name)) {
      return false
    }

    if (this.parent !== null) {
      return this.parent.has(name)
    }

    return false
  }

  public has(name: string): boolean {
    if (this._locals.has(name)) {
      return true
    }

    if (this.parent !== null) {
      return this.parent.has(name)
    }

    return false
  }
}

export function resolve_scopes(node: StillflowNode, scope: SymbolScope): Set<string> {
  const captures = new Set<string>()

  switch (node.kind) {
    case 'Expression': {
      for (const ref of node.refs) {
        if (scope.is_captured(ref)) {
          captures.add(ref)
        }
      }

      break
    }

    case 'Text': {
      if (typeof node.value !== 'string') {
        for (const capture of resolve_scopes(node.value, scope)) {
          captures.add(capture)
        }
      }

      break
    }

    case 'Element': {
      for (const expression of Object.values(node.dynamic_properties)) {
        for (const capture of resolve_scopes(expression, scope)) {
          captures.add(capture)
        }
      }

      for (const child of node.children) {
        for (const capture of resolve_scopes(child, scope)) {
          captures.add(capture)
        }
      }

      break
    }

    case 'For': {
      for (const capture of resolve_scopes(node.select, scope)) {
        captures.add(capture)
      }

      const body_scope = new SymbolScope(scope)

      body_scope.declare(node.item_name)
      body_scope.declare(node.index_name)

      const body_captures = new Set<string>()

      for (const child of node.body) {
        const inner_captures = resolve_scopes(child, body_scope)

        for (const capture of inner_captures) {
          if (scope.is_captured(capture)) {
            captures.add(capture)
            body_captures.add(capture)
          }
        }
      }

      node.meta.scope.captures = body_captures

      return captures
    }

    case 'Call': {
      for (const expression of Object.values(node.properties)) {
        for (const capture of resolve_scopes(expression, scope)) {
          captures.add(capture)
        }
      }

      break
    }
  }

  node.meta.scope.captures = captures

  return captures
}