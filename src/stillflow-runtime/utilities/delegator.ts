import { AbstractCollection } from "@/stillflow-collection/abstract/collection"

type EventTable = Record<string, (event: Event, context: any) => void>

export class EventDelegator {
  private _actives = new Set<string>()
  private _handlers = new Array<(event: Event, context: any) => void>()
  private _collections = new Array<AbstractCollection<any>>()

  private handle_global_event(event: Event) {
    const attribute_name = `data-sf-${event.type}`

    let child: HTMLElement | null = null
    let target = event.target as HTMLElement
    let handlerId = target.getAttribute(attribute_name)

    while (target && target !== document.body) {
      if (handlerId === null) {
        handlerId = target.getAttribute(attribute_name)
      }

      if (handlerId !== null) {
        const listId = target.getAttribute('data-sf-list')

        if (listId !== null) {
          let index = 0
          let previous = child?.previousElementSibling

          while (previous != null) {
            index++
            previous = previous.previousElementSibling
          }

          const collection = this._collections[parseInt(listId)]
          const context = collection.at(collection.map(index))

          console.log(collection.unmap(index), collection.map(index), context.id - 1)

          this._handlers[parseInt(handlerId)](event, context)

          if (event.cancelBubble) {
            break
          }

          handlerId = null
        }
      }

      child = target
      target = target.parentElement
    }
  }

  public register_collection(collection: AbstractCollection<any>): number {
    return this._collections.push(collection) - 1
  }

  public register(type: string, handler: (event: Event, context: any) => void): number {
    const id = this._handlers.push(handler) - 1

    if (!this._actives.has(type)) {
      this._actives.add(type)
      document.body.addEventListener(type, event => this.handle_global_event(event))
    }

    return id
  }
}

export const DELEGATOR = new EventDelegator()