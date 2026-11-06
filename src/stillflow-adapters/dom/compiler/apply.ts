import { Assembly, Instruction, compile } from "./compile.js"
import { transform } from "./transform.js"

type Applier = <V>(root: HTMLElement, context: V) => void

const Active = new Set<string>()
const Listeners = new WeakMap<HTMLElement, Map<string, (event: Event, context: any) => void>>()
const Targets = new WeakMap<HTMLElement, Map<string, HTMLElement>>()
const URLs = new Map<number[], string>()

function find_element(path: number[], root: HTMLElement): HTMLElement {
  let targets = Targets.get(root)

  if (targets === undefined) {
    targets = new Map()
    Targets.set(root, targets)
  }

  let url = URLs.get(path)

  if (url === undefined) {
    url = path.join('/')
    URLs.set(path, url)
  }

  let current = targets.get(url)

  if (current !== undefined) {
    return current
  }

  current = root

  for (let index = 0; index < path.length; index++) {
    current = current.children[path[index]] as HTMLElement
  }

  targets.set(url, current)

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

    target.nodeValue = text
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
    const { replaces, cleares, adds, removes, updates } = items.flush()

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

        bindings.length = items_count
      } else {
        const fragment = document.createDocumentFragment()
        const elements = new Array<HTMLElement>(items_count - child_count)

        for (let index = child_count; index < items_count; index++) {
          const element = pool.pop() || template.cloneNode(true)

          applier(element as HTMLElement, items.at(index))

          elements[index] = element as HTMLElement

          fragment.appendChild(element)
        }

        bindings = bindings.concat(elements)

        target.appendChild(fragment)
      }

      return
    }

    if (cleares) {
      pool = pool.concat(bindings.splice(0))
      target.innerHTML = String()
    }

    if (adds > 0) {
      const fragment = document.createDocumentFragment()
      const old_size = bindings.length
      const elements = new Array<HTMLElement>(adds)

      for (let index = 0; index < adds; index++) {
        const element = template.cloneNode(true)

        applier(element as HTMLElement, items.at(index + old_size))

        elements[index] = element as HTMLElement

        fragment.appendChild(element)
      }

      bindings = bindings.concat(elements)

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
      element.$context = context
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
  const appliers = {
    text: [],
    iterate: [],
    events: [],
    properties: []
  } as {
    text: Applier[],
    iterate: Applier[],
    events: Applier[],
    properties: Applier[]
  }

  for (const [path, instructions] of assembly.entries()) {
    if (instructions.text !== undefined) {
      appliers.text.push(apply_text(path, instructions.text))
    }

    if (instructions.iterate !== undefined) {
      appliers.iterate.push(apply_iterate(path, context, instructions.iterate))
    }

    if (instructions.properties !== undefined) {
      appliers.properties.push(apply_properties(path, instructions.properties))
    }

    if (instructions.events !== undefined) {
      appliers.events.push(apply_events(path, instructions.events))
    }
  }

  return <W>(root: HTMLElement, context: W) => {
    for (const applier of appliers.text) {
      applier(root, context)
    }

    for (const applier of appliers.events) {
      applier(root, context)
    }

    for (const applier of appliers.properties) {
      applier(root, context)
    }

    for (const applier of appliers.iterate) {
      applier(root, context)
    }
  }
}