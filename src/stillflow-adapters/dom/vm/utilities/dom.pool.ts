import { SF_CONTEXT, SF_LISTENED } from "./dom.symbols.js"

export class Pool {
  private static TIME_TO_EVICT = 2

  private _hots: { root: HTMLElement, frame: number }[] = []
  private _colds: WeakRef<HTMLElement>[] = []
  private _frame: number = 0

  private evict(): void {
    for (let id = this._hots.length - 1; id >= 0; id--) {
      const hot = this._hots[id]

      if (this._frame - hot.frame >= Pool.TIME_TO_EVICT) {
        const element = hot.root as any

        element[SF_CONTEXT] = null
        element[SF_LISTENED] = false

        this._colds.push(new WeakRef(hot.root))
      }
    }

    this._hots = this._hots.filter(hot => this._frame - hot.frame < Pool.TIME_TO_EVICT)
  }

  private retrieve(): void {
    if (this._hots.length <= 0) {
      while (this._colds.length > 0) {
        const cold = this._colds.pop()!
        const element = cold.deref()

        if (element !== undefined) {
          this._hots.push({ root: element, frame: this._frame })
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
}