import { Modifiers } from "../properties/modifiers.js"
import { Template, Compiler } from "./compile.js"
import { transform } from "./transform.js"

const SF_LISTENED = '__stillflow_listened__'
const SF_CONTEXT = '__stillflow_context__'
const SF_CACHE_TEXT = '__stillflow_cache_text__'
const SF_CACHE = '__stillflow_cache__'

class Listeners {
  private _listeners = new WeakMap<HTMLElement, Map<string, (event: Event, context: any) => void>>()
  private _actives = new Set<string>()

  private ensure(type: string): void {
    if (this._actives.has(type)) {
      return
    }

    this._actives.add(type)

    document.body.addEventListener(type, event => {
      let target = event.target as HTMLElement

      while (target && target !== document.body) {
        const listeners = this._listeners.get(target)

        if (listeners !== undefined) {
          const callback = listeners.get(type)

          callback?.(event, (target as any)[SF_CONTEXT])

          if (event.cancelBubble) {
            break
          }
        }

        target = target.parentElement as HTMLElement
      }
    })
  }

  public remove(root: HTMLElement): void {
    this._listeners.delete(root)
  }

  public add(root: HTMLElement, type: string, listener: (event: Event, context: any) => void): void {
    const listeners = this._listeners.get(root)! || new Map()

    listeners.set(type, listener)

    this._listeners.set(root, listeners)

    this.ensure(type)
  }
}

class Pool {
  private static TIME_TO_EVICT = 2

  private _hots: { root: HTMLElement, frame: number }[] = []
  private _colds: WeakRef<HTMLElement>[] = []
  private _frame: number = 0

  public constructor(private _listeners: Listeners) { }

  private evict(): void {
    for (let id = this._hots.length - 1; id >= 0; id--) {
      const hot = this._hots[id]

      if (this._frame - hot.frame >= Pool.TIME_TO_EVICT) {
        this._listeners.remove(hot.root)

        const element = hot.root as any

        element[SF_CONTEXT] = null
        element[SF_LISTENED] = false

        this._colds.push(new WeakRef(hot.root))
        this._hots.splice(id, 1)
      }
    }
  }

  private retrieve(): void {
    if (this._hots.length <= 0) {
      while (this._colds.length > 0) {
        const cold = this._colds.pop()!
        const element = cold.deref()

        if (element !== undefined) {
          this._hots.push({ root: element, frame: this._frame })
          return
        }
      }
    }
  }

  public get(): HTMLElement | undefined {
    this.retrieve()

    const element = this._hots.pop()

    if (element === undefined) {
      return undefined
    }

    element.frame = this._frame

    return element.root
  }

  public add(root: HTMLElement): void {
    this._hots.push({ root, frame: this._frame })
  }

  public tick(): void {
    this.evict()
    console.log(this._frame)
    this._frame++
  }
}

class CollectionApplier<V> {
  private _compilation: Template<unknown>
  private _template: HTMLElement
  private _elements: HTMLElement[] = []
  private _appliers: Appliers<unknown>
  private _applier: Applier<unknown> | undefined

  public constructor(private _pool: Pool, private _id: number, private _payload: Modifiers<V>['iterate']) {
    const node = this._payload!.each()

    const compiler = new Compiler<unknown>()
    const appliers = new Appliers<unknown>()

    const template = transform(node)
    const compilation = compiler.compile(node)

    this._appliers = appliers
    this._compilation = compilation
    this._template = template

    const pool = this._pool

    function schedule() {
      requestIdleCallback(function clean(deadline) {
        if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
          pool.tick()
        }

        schedule()
      }, { timeout: 1000 })
    }

    schedule()
  }

  public apply(root: HTMLElement, context: V): void {
    if (this._applier === undefined) {
      this._applier = this._appliers.apply(this._compilation)
    }

    const items = this._payload!.select(context)

    const nodes = (root as any)[SF_CACHE]
    const target = nodes[this._id]

    const { replaces, clears, addes, swaps, removes, updates } = items.flush()

    if (replaces) {
      const items_count = items.size
      const child_count = this._elements.length
      const common_count = Math.min(items_count, child_count)

      for (let index = 0; index < common_count; index++) {
        this._applier(this._elements[index], items.at(index))
      }

      if (items_count < child_count) {
        for (let index = items_count; index < child_count; index++) {
          const element = this._elements[index] as any

          this._pool.add(element)

          element.remove()
        }

        this._elements.length = items_count
      } else if (child_count < items_count) {
        const fragment = document.createDocumentFragment()
        const elements = new Array<HTMLElement>(items_count - child_count)

        for (let index = child_count; index < items_count; index++) {
          const element = this._pool.get() || this._template.cloneNode(true) as HTMLElement

          this._applier(element, items.at(index))

          elements[index - child_count] = element

          fragment.appendChild(element)
        }

        this._elements = this._elements.concat(elements)

        target.appendChild(fragment)
      }

      return
    }

    if (clears) {
      const free = this._elements.splice(0)

      for (const element of free) {
        this._pool.add(element)
      }

      target.innerHTML = String()
    }

    if (addes > 0) {
      const fragment = document.createDocumentFragment()
      const elements = new Array<HTMLElement>(addes)

      for (let index = 0; index < addes; index++) {
        const element = this._template.cloneNode(true)

        this._applier(element as HTMLElement, items.at(index))

        elements[index] = element as HTMLElement

        fragment.appendChild(element)
      }

      this._elements = this._elements.concat(elements)

      target.appendChild(fragment)
    }

    for (const [i, j] of swaps.entries()) {
      this._applier(this._elements[i], items.at(i))
      this._applier(this._elements[j], items.at(j))
    }

    for (const id of removes) {
      const element = this._elements[id]

      this._pool.add(element)

      element.remove()
    }

    for (const id of updates) {
      this._applier(this._elements[id], items.at(id))
    }
  }
}

type Applier<V> = (root: HTMLElement, context: V) => void

export class Appliers<V> {
  private _listeners = new Listeners()

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
      const nodes = (root as any)[SF_CACHE_TEXT]
      const textnode = nodes[id]

      textnode.nodeValue = text
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

      for (let key in payload) {
        this._listeners.add(element, key, (payload as any)[key])
      }
    }
  }

  private apply_iterate(id: number, payload: Modifiers<V>['iterate']): Applier<V> {
    const pool = new Pool(this._listeners)
    const appliers = new CollectionApplier<V>(pool, id, payload)

    return (root, context) => appliers.apply(root, context)
  }

  private markup(root: HTMLElement, paths: number[][]): HTMLElement[] {
    const node = root as any

    if (node[SF_CACHE]) {
      return node[SF_CACHE]
    }

    const cache = new Array<HTMLElement>(paths.length)
    const text_cache = new Array<Text>(paths.length)

    for (let id = 0; id < paths.length; id++) {
      cache[id] = this.find_element_by(root, paths[id])
      text_cache[id] = cache[id].firstChild as Text
    }

    node[SF_CACHE] = cache
    node[SF_CACHE_TEXT] = text_cache

    return cache
  }

  public apply(template: Template<V>): Applier<V> {
    const { instructions, paths } = template
    const appliers = new Array<Applier<V>>(instructions.length)

    let fill_index = 0

    for (let index = 0; index < instructions.length; index++) {
      const instruction = instructions[index]
      const id = instruction.id

      if (instruction.text !== undefined) {
        appliers[fill_index++] = this.apply_text(id, instruction.text)
      }

      if (instruction.iterate !== undefined) {
        appliers[fill_index++] = this.apply_iterate(id, instruction.iterate)
      }

      if (instruction.events !== undefined) {
        appliers[fill_index++] = this.apply_events(id, instruction.events)
      }

      if (instruction.properties !== undefined) {
        appliers[fill_index++] = this.apply_properties(id, instruction.properties)
      }

      if (instruction.conditional !== undefined) {
        appliers[fill_index++] = this.apply_conditional(id, instruction.conditional)
      }
    }

    return (root: HTMLElement, context: V) => {
      this.markup(root, paths)

      for (const applier of appliers) {
        applier(root, context)
      }
    }
  }
}
