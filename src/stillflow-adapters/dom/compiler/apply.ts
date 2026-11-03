import { Assembly, Instruction, compile } from "./compile.js"
import { transform } from "./transform.js"

type Applier = <V>(root: HTMLElement, context: V) => void

const Active = new Set<string>()
const Listeners = new WeakMap<HTMLElement, Map<string, (event: Event, context: any) => void>>()

function find_element(path: number[], root: HTMLElement): HTMLElement {
  let current = root.children[path[0]]

  for (let index = 1; index < path.length; index++) {
    current = current.children[path[index]]
  }

  return current as HTMLElement
}

function ensure_event_listener(name: string): void {
  if (Active.has(name)) {
    return
  }

  Active.add(name)

  document.body.addEventListener(name, function (event) {
    let target = event.target as HTMLElement

    while (target && target !== document.body) {
      const listeners = Listeners.get(target)

      if (listeners !== undefined) {
        const callback = listeners.get(name)

        callback?.(event, (target as any).$context)

        if (event.cancelBubble) {
          break
        }
      }

      target = target.parentElement as HTMLElement
    }
  })
}

function apply_text(path: number[], instruction: Instruction<any, 'text'>): Applier {
  const text_cache = new WeakMap<HTMLElement, Node>()

  return <V>(root: HTMLElement, context: V) => {
    let target = text_cache.get(root)!

    const text = instruction.payload?.(context) as string

    if (target === undefined) {
      const element = find_element(path, root)

      target = element.firstChild!

      if (target.nodeType !== Node.TEXT_NODE) {
        target = document.createTextNode(text)
        element.insertBefore(target, null)
      } else {
        target.nodeValue = text
      }

      text_cache.set(root, target as Node)
    } else {
      target.nodeValue = text
    }
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

  const bindings: HTMLElement[] = []
  const pool: HTMLElement[] = []

  return (root: HTMLElement) => {
    const target = find_element(path, root)

    const { cleares, replaces, removes, updates, addes } = items.flush()

    if (replaces) {
      const children_count = bindings.length
      const items_count = items.total_size
      const common_count = Math.min(items_count, children_count)

      for (let index = 0; index < common_count; index++) {
        applier(bindings[index] as HTMLElement, items.at(index))
      }

      if (items_count > children_count) {
        const fragment = document.createDocumentFragment()

        for (let index = common_count; index < items_count; index++) {
          const element = pool.pop() || template.cloneNode(true)

          bindings.push(element as HTMLElement)

          applier(element as HTMLElement, items.at(index))

          fragment.appendChild(element)
        }

        target.appendChild(fragment)
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

    const fragment = document.createDocumentFragment()

    for (const item of addes) {
      const element = pool.pop() || template.cloneNode(true)

      applier(element as HTMLElement, item)

      bindings.push(element as HTMLElement)

      fragment.appendChild(element)
    }

    target.appendChild(fragment)

    for (const id of removes) {
      const element = bindings[id]

      pool.push(element as HTMLElement)

      element.remove()
    }

    for (const id of updates) {
      applier(bindings[id], items.at(id))
    }

    if (cleares) {
      pool.push(...bindings.splice(0))
      target.innerHTML = String()
    }
  }
}

function apply_events(path: number[], instruction: Instruction<any, 'events'>): Applier {
  return <V>(root: HTMLElement, context: V) => {
    const target = find_element(path, root)
    const events = instruction.payload || {}
    const element = target as any

    element.$context = context

    const listeners = Listeners.get(target)! || new Map()

    for (const key in events) {
      listeners.set(key, (events as any)[key])

      ensure_event_listener(key)
    }

    Listeners.set(element, listeners)
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