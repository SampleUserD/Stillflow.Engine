import { Modifiers } from "../properties/modifiers.js"
import { Template, Compiler } from "./compile.js"
import { transform } from "./transform.js"

const SF_LISTENED = '__stillflow_listened__'
const SF_CONTEXT = '__stillflow_context__'
const SF_CACHE = '__stillflow_cache__'

type Applier<V> = (root: HTMLElement, context: V) => void

export class Appliers<V> {
  private _listeners = new WeakMap<HTMLElement, Map<string, (event: Event, context: any) => void>>()
  private _actives = new Set<string>()

  private ensure_listener(name: string): void {
    if (this._actives.has(name)) {
      return
    }

    this._actives.add(name)

    document.body.addEventListener(name, event => {
      let target = event.target as HTMLElement

      while (target && target !== document.body) {
        const listeners = this._listeners.get(target)

        if (listeners !== undefined) {
          const callback = listeners.get(name)

          callback?.(event, (target as any)[SF_CONTEXT])

          if (event.cancelBubble) {
            break
          }
        }

        target = target.parentElement as HTMLElement
      }
    })
  }

  private find_element_by(root: HTMLElement, path: number[]): HTMLElement {
    let current = root

    for (let id = 0; id < path.length; id++) {
      current = current.children[path[id]] as HTMLElement
    }

    return current
  }

  private apply_conditional(id: number, payload: Modifiers<V>['conditional']): Applier<V> {
    return (root: HTMLElement, context: V) => {
      const nodes = (root as any)[SF_CACHE]
      const target = nodes[id]
      const condition = payload!(context)

      target.style.display = condition ? String() : 'none'
    }
  }

  private apply_text(id: number, payload: Modifiers<V>['text']): Applier<V> {
    return (root: HTMLElement, context: V) => {
      const text = payload!(context)

      const nodes = (root as any)[SF_CACHE]
      const element = nodes[id]

      element.firstChild!.nodeValue = text
    }
  }

  private apply_properties(id: number, payload: Modifiers<V>['properties']): Applier<V> {
    return (root: HTMLElement, context: V) => {
      const nodes = (root as any)[SF_CACHE]
      const element = nodes[id]

      for (const key in payload) {
        (element as any)[key] = (payload as any)[key](context)
      }
    }
  }

  private apply_events(id: number, payload: Modifiers<V>['events']): Applier<V> {
    return (root: HTMLElement, context: V) => {
      const nodes = (root as any)[SF_CACHE]
      const element = nodes[id] as any

      if (element[SF_LISTENED]) {
        element[SF_CONTEXT] = context
        return
      }

      element[SF_LISTENED] = true
      element[SF_CONTEXT] = context

      const listeners = this._listeners.get(element)! || new Map()

      for (let key in payload) {
        listeners.set(key, (payload as any)[key])

        this.ensure_listener(key)
      }

      this._listeners.set(element, listeners)
    }
  }

  private apply_iterate(id: number, payload: Modifiers<V>['iterate']): Applier<V> {
    const SPACE = " "

    const node = payload!.each()

    const compiler = new Compiler<unknown>()
    const appliers = new Appliers<unknown>()

    const template = transform(node)
    const compilation = compiler.compile(node)
    const applier = appliers.apply(compilation)

    let bindings = new Array<HTMLElement>()
    let pool = new Array<HTMLElement>()

    return (root: HTMLElement, context: V) => {
      const items = payload!.select(context)

      const nodes = (root as any)[SF_CACHE]
      const target = nodes[id]

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
        target.innerHTML = SPACE
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

  private markup(root: HTMLElement, paths: number[][]): HTMLElement[] {
    const node = root as any

    if (node[SF_CACHE]) {
      return node[SF_CACHE]
    }

    const cache = new Array<HTMLElement>(paths.length)

    for (let id = 0; id < paths.length; id++) {
      cache[id] = this.find_element_by(root, paths[id])
    }

    node[SF_CACHE] = cache

    return cache
  }

  public apply(template: Template<V>): Applier<V> {
    const { instructions, paths } = template
    const appliers = {
      text: new Array<Applier<V>>(),
      iterate: new Array<Applier<V>>(),
      events: new Array<Applier<V>>(),
      properties: new Array<Applier<V>>(),
      conditional: new Array<Applier<V>>()
    }

    for (let index = 0; index < instructions.length; index++) {
      const instruction = instructions[index]
      const id = instruction.id

      if (instruction.text !== undefined) {
        appliers.text.push(this.apply_text(id, instruction.text))
      }

      if (instruction.iterate !== undefined) {
        appliers.iterate.push(this.apply_iterate(id, instruction.iterate))
      }

      if (instruction.events !== undefined) {
        appliers.events.push(this.apply_events(id, instruction.events))
      }

      if (instruction.properties !== undefined) {
        appliers.properties.push(this.apply_properties(id, instruction.properties))
      }

      if (instruction.conditional !== undefined) {
        appliers.conditional.push(this.apply_conditional(id, instruction.conditional))
      }
    }

    return (root: HTMLElement, context: V) => {
      this.markup(root, paths)

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

      for (const applier of appliers.conditional) {
        applier(root, context)
      }
    }
  }
}
