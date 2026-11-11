const SF_LISTENED = '__stillflow_listened__'
const SF_CONTEXT = '__stillflow_context__'
const SF_CACHE_TEXT = '__stillflow_cache_text__'
const SF_CACHE = '__stillflow_cache__'

export class Listeners {
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

export class Pool {
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
    this._frame++
  }

  public get listeners() {
    return this._listeners
  }
}
