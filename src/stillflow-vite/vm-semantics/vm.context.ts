import type { StillflowNode } from "@/stillflow-vite/vm-semantics"
import { BytecodeBuilder } from "@/stillflow-vite/vm-semantics/vm.bytecode-builder"
import { BytecodeResources } from "@/stillflow-vite/vm-semantics/vm.bytecode-resources"

export type StillflowResourceTypes = {
  'string': string,
  'number': number
}

export const StillflowResourceResolvers: { [K in keyof StillflowResourceTypes]: (value: StillflowResourceTypes[K], resources: BytecodeResources) => number } = {
  string: (value: string, resources: BytecodeResources) => resources.add('string', value),
  number: (value: number, resources: BytecodeResources) => value
}

export class StillflowContext {
  private _builder = new BytecodeBuilder()
  private _resources = new BytecodeResources()
  private _forward: StillflowNode[] = []

  public constructor(private _root: StillflowNode, private _target: number = 0) {
    this._root.traverse(node => this._forward.push(node))
  }

  public child(): StillflowContext {
    const context = new StillflowContext(this._root, this._target)

    context._builder = this._builder.child()
    context._resources = this._resources

    return context
  }

  public indirect(node: StillflowNode, to: StillflowNode) {
    return this._builder.register(node, this.count_of(to))
  }

  public count_subtree(node: StillflowNode, predicate: (node: StillflowNode) => boolean): number {
    let result: number = 0

    for (let index = this._forward.indexOf(node) - 1; index >= 0; index--) {
      if (predicate(this._forward[index])) {
        result += 1
      }
    }

    return result
  }

  public count_suptree(node: StillflowNode, predicate: (node: StillflowNode) => boolean): number {
    let result: number = 0

    for (let index = this._forward.indexOf(node); index < this._forward.length; index++) {
      if (predicate(this._forward[index])) {
        result += 1
      }
    }

    return result
  }

  public get_parent_of(node: StillflowNode, predicate: (node: StillflowNode) => boolean, count: number = 1): StillflowNode {
    let counter: number = 0
    let result: StillflowNode = node

    for (let index = this._forward.indexOf(node) + 1; index < this._forward.length; index++) {
      if (predicate(this._forward[index])) {
        counter += 1
        result = this._forward[index]

        if (counter >= count) {
          break
        }
      }
    }

    return result
  }

  public add<K extends keyof StillflowResourceTypes>(category: K, resource: StillflowResourceTypes[K]) {
    return this._resources.add(category, resource)
  }

  public get<K extends keyof StillflowResourceTypes>(category: K, index: number): StillflowResourceTypes[K] {
    return this._resources.get(category, index)
  }

  public count(node: StillflowNode) {
    return this._builder.register(node) as number
  }

  public count_of(node: StillflowNode) {
    return this._builder.slot_of(node)
  }

  public chunk(site: () => void) {
    return this._builder.emit_chunk(this._builder.cut(site))
  }

  public create_chunk(code: number[]) {
    return this._builder.emit_chunk(code)
  }

  public embed(code: StillflowResourceTypes[keyof StillflowResourceTypes][]) {
    return this._builder.embed_code(...code.map(bit => StillflowResourceResolvers[typeof bit](bit, this._resources)))
  }

  public emit(opcode: number, ...code: StillflowResourceTypes[keyof StillflowResourceTypes][]) {
    return this._builder.emit_code(this._target, opcode, ...code.map(bit => StillflowResourceResolvers[typeof bit](bit, this._resources)))
  }

  public separate(opcode: number, ...code: StillflowResourceTypes[keyof StillflowResourceTypes][]) {
    return this._builder.cut(() => this.emit(opcode, ...code))
  }

  public build() {
    return this._builder.build()
  }

  public get current_count() {
    return this._builder.last_slot_id
  }
}