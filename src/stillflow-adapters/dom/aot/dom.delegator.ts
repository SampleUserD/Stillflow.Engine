import { SF_CONTEXT, SF_HANDLERS } from "./dom.symbols.js"

export class EventDelegator {
  private _actives = new Set<string>()

  private ensure(type: string): void {
    if (this._actives.has(type)) {
      return
    }

    this._actives.add(type)

    document.body.addEventListener(type, event => {
      let target = event.target as HTMLElement

      while (target && target !== document.body) {
        const listeners = (target as any)[SF_HANDLERS]

        if (listeners !== undefined) {
          const callback = listeners[type]

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
    const element = root as any

    element[SF_CONTEXT] = null
    element[SF_HANDLERS] = undefined
  }

  public add(root: HTMLElement, type: string, listener: (event: Event, context: any) => void): void {
    const element = root as any

    if (element[SF_HANDLERS] !== undefined) {
      return
    }

    const listeners = Object.create(null)

    listeners[type] = listener

    element[SF_HANDLERS] = listeners

    this.ensure(type)
  }
}