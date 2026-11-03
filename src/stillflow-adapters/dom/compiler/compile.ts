import { AnyDOM } from "../dom.js"
import { Modifiers } from "../properties/modifiers.js"

export type Instruction<V, K extends keyof Modifiers<V>> = {
  kind: K,
  payload: Modifiers<V>[K]
}

export type Assembly<V> = Map<number[], Instruction<V, keyof Modifiers<V>>[]>

export function compile<V>(root: AnyDOM<V>) {
  const instructions: Assembly<V> = new Map()

  recursive_compile(root, [], instructions)

  return instructions
}

function recursive_compile<V>(description: AnyDOM<V>, path: number[], instructions: Assembly<V>) {
  let { modifiers, events } = description.properties

  modifiers = modifiers || {}

  const payload: Instruction<V, keyof Modifiers<V>>[] = []

  if (modifiers.text !== undefined) {
    payload.push({ kind: 'text', payload: modifiers.text })
  }

  if (modifiers.lens !== undefined) {
    payload.push({ kind: 'lens', payload: modifiers.lens })
  }

  if (modifiers.iterate !== undefined) {
    payload.push({ kind: 'iterate', payload: modifiers.iterate })
  }

  if (modifiers.events !== undefined) {
    payload.push({ kind: 'events', payload: modifiers.events })
  }

  if (payload.length > 0) {
    instructions.set(path, payload)
  }

  for (let index = 0; index < description.children.length; index++) {
    recursive_compile(description.children[index], [...path, index], instructions)
  }
}