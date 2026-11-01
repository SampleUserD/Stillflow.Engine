import { Binding } from "../binding.js"

export function delegate<T, E extends keyof HTMLElementEventMap>(event: E, { selector, handler, to }: { selector: string, handler: (event: HTMLElementEventMap[E], target: Element) => void, to: Binding<HTMLElement, T> }): Binding<HTMLElement, T> {
  const listener = (event: Event) => {
    const target = (event.target as Element)?.closest(selector)

    if (target) {
      handler(event as HTMLElementEventMap[E], target)
    }
  }

  const create = (root: HTMLElement) => {
    root.addEventListener(event, listener)
    return to.create(root)
  }

  const update = () => { }

  const destroy = (root: HTMLElement) => {
    root.removeEventListener(event, listener)
  }

  return {
    create,
    update,
    destroy
  }
}