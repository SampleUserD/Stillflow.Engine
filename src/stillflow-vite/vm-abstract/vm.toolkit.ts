import { TargetId } from "@/stillflow-vite/vm-abstract/vm.instruction"
import type { NodePath, Scope, types } from "@babel/core"

export interface VMCounter {
  next(): number
  identifier(): types.Identifier
}

export interface VMCache {
  hoist(key: string, factory: () => types.Expression): types.Identifier
  has(key: string): boolean
}

export interface VMCounterFactory {
  create(prefix: string): VMCounter

  clear(): void
}

export interface VMRecursion {
  is_recursive(path: string): boolean

  push(path: string): void

  pop(path: string): void

  scope(path: string, site: (path: string) => void): void
}

export interface VMComponentInformation {
  node: types.Node,
  parameters: types.Identifier[],
  body: types.JSXElement,
  filename: string,
  scope: Scope | null
}

export interface VMImportInformation {
  source: string,
  imported_name: string,
  is_default: boolean
}

export interface VMToolkit {
  readonly context: {
    elements: NodePath<types.JSXElement>[]
    components: Map<string, VMComponentInformation>,
    imports: Map<string, VMImportInformation>
  }
  readonly target: TargetId

  recursion: VMRecursion
  counters: VMCounterFactory

  readonly stack: Set<string>
}