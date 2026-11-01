import { Binding } from "../binding.js";

export function delegate<E extends keyof HTMLElementEventMap>(event: E, selector: string, handler: (event: HTMLElementEventMap[E], target: Element) => void): Binding<HTMLElement, any> {
  const listener = (event: Event) => {
    const target = (event.target as Element)?.closest(selector)

    if (target) {
      handler(event as HTMLElementEventMap[E], target)
    }
  }

  const create = (root: HTMLElement) => {
    root.addEventListener(event, listener)
    return root
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