import { AnyDOM } from "../dom.js"
import { Modifiers } from "../properties/modifiers.js"

export type Instruction<V, K extends keyof Modifiers<V>> = {
  kind: K,
  payload: Modifiers<V>[K]
}

export type Assembly<V> = Map<number[], Partial<{ [L in keyof Modifiers<V>]: Instruction<V, L> }>>

export function compile<V>(root: AnyDOM<V>) {
  const instructions: Assembly<V> = new Map()

  recursive_compile(root, [], instructions)

  return instructions
}

function recursive_compile<V>(description: AnyDOM<V>, path: number[], instructions: Assembly<V>) {
  let { modifiers } = description.properties
  let has_instructions = false

  modifiers = modifiers || {}

  const payload = {} as { [L in keyof Modifiers<V>]: Instruction<V, L> }

  if (modifiers.properties !== undefined) {
    has_instructions = true

    payload.properties = { kind: 'properties', payload: modifiers.properties }
  }

  if (modifiers.text !== undefined) {
    has_instructions = true

    payload.text = { kind: 'text', payload: modifiers.text }
  }

  if (modifiers.lens !== undefined) {
    has_instructions = true

    payload.lens = { kind: 'lens', payload: modifiers.lens }
  }

  if (modifiers.iterate !== undefined) {
    has_instructions = true

    payload.iterate = { kind: 'iterate', payload: modifiers.iterate }
  }

  if (modifiers.events !== undefined) {
    has_instructions = true

    payload.events = { kind: 'events', payload: modifiers.events }
  }

  if (has_instructions) {
    instructions.set(path, payload)
  }

  for (let index = 0; index < description.children.length; index++) {
    recursive_compile(description.children[index], [...path, index], instructions)
  }
}