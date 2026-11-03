import { Assembly, Instruction, compile } from "./compile.js"
import { transform } from "./transform.js"

type Applier = <V>(root: HTMLElement, context: V) => void

function find_element(path: number[], root: HTMLElement): HTMLElement {
  let current = root.children[path[0]]

  for (let index = 1; index < path.length; index++) {
    current = current.children[path[index]]
  }

  return current as HTMLElement
}

function apply_text(path: number[], instruction: Instruction<any, 'text'>): Applier {
  return <V>(root: HTMLElement, context: V) => {
    const target = find_element(path, root)
    const text = instruction.payload?.(context) as string

    if (target.firstChild === null || target.firstChild.nodeType !== Node.TEXT_NODE) {
      target.insertBefore(document.createTextNode(text), null)
      return
    }

    target.firstChild.nodeValue = text
  }
}

function apply_iterate<V>(path: number[], context: V, instruction: Instruction<V, 'iterate'>): Applier {
  if (instruction.payload === undefined) {
    throw new Error(`No payload for instruction "iterate"`)
  }

  const { each, select } = instruction.payload

  const items = select(context)

  const description = each()
  const template = transform(description)
  const applier = apply(items, compile(description))

  const pool: HTMLElement[] = []

  return (root: HTMLElement) => {
    const target = find_element(path, root)

    const { cleares, replaces, removes, updates, addes } = items.flush()

    const fragment = document.createDocumentFragment()

    for (const item of addes) {
      const element = pool.pop() || template.cloneNode(true)

      applier(element as HTMLElement, item)

      fragment.appendChild(element)
    }

    target.appendChild(fragment)

    for (const id of removes) {
      const element = target.children[id]

      pool.push(element as HTMLElement)

      element.remove()
    }

    for (const id of updates) {
      applier(target.children[id] as HTMLElement, items.at(id))
    }

    if (replaces) {
      const children_count = target.children.length
      const items_count = items.total_size
      const common_count = Math.min(items_count, children_count)

      for (let index = 0; index < common_count; index++) {
        applier(target.children[index] as HTMLElement, items.at(index))
      }

      if (items_count > children_count) {
        const fragment = document.createDocumentFragment()

        for (let index = common_count; index < items_count; index++) {
          const element = pool.pop() || template.cloneNode(true)

          applier(element as HTMLElement, items.at(index))

          fragment.appendChild(element)
        }
      } else if (children_count < items_count) {
        while (target.children.length > items_count) {
          const last = target.lastElementChild

          if (last !== null) {
            pool.push(last as HTMLElement)
            last.remove()
          }
        }
      }

      return undefined
    }

    if (cleares) {
      while (target.lastElementChild) {
        const last = target.lastElementChild

        pool.push(last as HTMLElement)
        last.remove()
      }
    }
  }
}

function apply_events(path: number[], instruction: Instruction<any, 'events'>): Applier {
  return <V>(root: HTMLElement, context: V) => {
    const target = find_element(path, root)
    const events = instruction.payload || {}

    for (const key in events) {
      target.addEventListener(key, event => (events as any)[key](event, context))
    }
  }
}

export function apply<V>(context: V, assembly: Assembly<V>): Applier {
  const appliers: Applier[] = []

  for (const [path, instructions] of assembly.entries()) {
    for (const instruction of instructions) {
      switch (instruction.kind) {
        case 'text':
          appliers.push(apply_text(path, instruction as Instruction<V, typeof instruction.kind>))
          break
        case 'iterate':
          appliers.push(apply_iterate(path, context, instruction as Instruction<V, typeof instruction.kind>))
          break
        case 'lens':
          break
        case 'events':
          appliers.push(apply_events(path, instruction as Instruction<V, typeof instruction.kind>))
          break
        default:
          throw new Error(`No such type of instruction as ${instruction.kind}`)
      }
    }
  }

  return <W>(root: HTMLElement, context: W) => appliers.forEach(applier => applier(root, context))
}