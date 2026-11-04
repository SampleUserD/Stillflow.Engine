import { Assembly, Instruction, compile } from "./compile.js"
import { transform } from "./transform.js"

type Applier = <V>(root: HTMLElement, context: V) => void

const Active = new Set<string>()
const Listeners = new WeakMap<HTMLElement, Map<string, (event: Event, context: any) => void>>()
const Targets = new WeakMap<HTMLElement, Map<string, HTMLElement>>()

function find_element(path: number[], root: HTMLElement): HTMLElement {
  let targets = Targets.get(root)

  if (targets === undefined) {
    targets = new Map()
    Targets.set(root, targets)
  }

  let current = targets.get(path.join('/'))

  if (current !== undefined) {
    return current
  }

  current = root

  for (let index = 0; index < path.length; index++) {
    current = current.children[path[index]] as HTMLElement
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
  return <V>(root: HTMLElement, context: V) => {
    const text = instruction.payload?.(context) as string
    const element = find_element(path, root)

    let target = element.firstChild!

    if (target === null || target.nodeType !== Node.TEXT_NODE) {
      target = document.createTextNode(text)
      element.insertBefore(target, null)
    } else {
      target.nodeValue = text
    }
  }
}

function apply_properties(path: number[], instruction: Instruction<any, 'properties'>): Applier {
  const properties = instruction.payload || {}

  return <V>(root: HTMLElement, context: V) => {
    const target = find_element(path, root)

    for (const key in properties) {
      (target as any)[key] = (properties as any)[key](context)
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
  const compilation = compile(description)
  const applier = apply(items, compilation)

  let bindings: HTMLElement[] = []
  let pool: HTMLElement[] = []

  return (root: HTMLElement) => {
    const target = find_element(path, root)
    const { replaces, cleares, removes, updates, addes } = items.flush()

    if (replaces) {
      const items_count = items.total_size
      const child_count = bindings.length
      const common_count = Math.min(items_count, child_count)

      for (let index = 0; index < common_count; index++) {
        applier(bindings[index], items.at(index))
      }

      if (items_count < child_count) {
        for (let index = items_count; index < child_count; index++) {
          pool.push(bindings[index])

          bindings[index].remove()
        }
      } else {
        const fragment = document.createDocumentFragment()

        for (let index = child_count; index < items_count; index++) {
          const element = pool.pop() || template.cloneNode(true)

          applier(element as HTMLElement, items.at(index))

          bindings.push(element as HTMLElement)

          fragment.appendChild(element)
        }

        target.appendChild(fragment)
      }

      return
    }

    if (cleares) {
      pool = pool.concat(bindings.splice(0))
      target.innerHTML = String()
    }

    if (addes.length > 0) {
      const fragment = document.createDocumentFragment()

      for (const item of addes) {
        const element = pool.pop() || template.cloneNode(true)

        applier(element as HTMLElement, item)

        bindings.push(element as HTMLElement)

        fragment.appendChild(element)
      }

      target.appendChild(fragment)
    }

    for (const id of removes) {
      const element = bindings[id]

      pool.push(element as HTMLElement)

      element.remove()
    }

    for (const id of updates) {
      applier(bindings[id], items.at(id))
    }
  }
}

function apply_events(path: number[], instruction: Instruction<any, 'events'>): Applier {
  return <V>(root: HTMLElement, context: V) => {
    const target = find_element(path, root)
    const element = target as any

    if (element.$listened) {
      return
    }

    const events = instruction.payload || {}

    element.$listened = true
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
        case 'events':
          appliers.push(apply_events(path, instruction as Instruction<V, typeof instruction.kind>))
          break
        case 'properties':
          appliers.push(apply_properties(path, instruction as Instruction<V, typeof instruction.kind>))
          break
        default:
          throw new Error('Undefined operator')
      }
    }
  }

  return <W>(root: HTMLElement, context: W) => appliers.forEach(applier => applier(root, context))
}