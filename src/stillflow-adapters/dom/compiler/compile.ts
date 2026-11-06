import { AnyDOM } from "../dom.js"
import { Modifiers } from "../properties/modifiers.js"

export type Instructions<V> = Partial<{ [L in keyof Modifiers<V>]: Modifiers<V>[L] }> & { id: number }

export type Template<V> = {
  paths: number[][],
  instructions: Instructions<V>[]
}

export class Compiler<V> {
  private ID_COUNTER = 0

  private _paths: number[][] = []
  private _instructions: Instructions<V>[] = []

  private recursive_compile(node: AnyDOM<V>, path: number[]): void {
    const modifiers = node.properties.modifiers || {}

    const has_modifiers =
      modifiers.text !== undefined ||
      modifiers.properties !== undefined ||
      modifiers.events !== undefined ||
      modifiers.iterate !== undefined

    if (has_modifiers) {
      const current_id = this.ID_COUNTER++

      this._paths.push(path)

      const instruction: Instructions<V> = { id: current_id }

      if (modifiers.text !== undefined) {
        instruction.text = modifiers.text
      }

      if (modifiers.properties !== undefined) {
        instruction.properties = modifiers.properties
      }

      if (modifiers.events !== undefined) {
        instruction.events = modifiers.events
      }

      if (modifiers.iterate !== undefined) {
        instruction.iterate = modifiers.iterate
      }

      this._instructions.push(instruction)
    }

    for (let index = 0; index < node.children.length; index++) {
      this.recursive_compile(node.children[index], [...path, index])
    }
  }

  public compile(root: AnyDOM<V>): Template<V> {
    this.ID_COUNTER = 0
    this._instructions = []
    this._paths = []

    this.recursive_compile(root, [])

    return {
      paths: this._paths,
      instructions: this._instructions
    }
  }
}
