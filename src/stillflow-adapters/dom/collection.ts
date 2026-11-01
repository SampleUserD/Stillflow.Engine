import { Binding } from "../binding.js"
import { Collection } from "../../index.js"

type CollectionProperties<T, V> = {
  root: Binding<HTMLElement, any>,
  select: (context: T) => Collection<V>,
  each: () => Binding<HTMLElement, V>
}

export function collection<V, T>(properties: CollectionProperties<T, V>): Binding<HTMLElement, T> {
  const { root, select, each } = properties

  const template_binding = each()
  const bindings: HTMLElement[] = []

  let old_size = 0

  const create = () => root.create()

  const update = (context: T, root: HTMLElement) => {
    const items = select(context)
    const { updates, removes, cleares } = items.flush()

    const fragment = document.createDocumentFragment()

    if (cleares) {
      root.innerHTML = String()
    }

    for (let index = old_size; index < items.total_size; index++) {
      const element = template_binding.create()

      bindings.push(element)

      template_binding.update(items.at(index), element)

      fragment.appendChild(element)
    }

    root.appendChild(fragment)

    old_size = items.total_size

    for (let index = 0; index < updates.length; index++) {
      template_binding.update(items.at(updates[index]), bindings[index])
    }

    for (let index = 0; index < removes.length; index++) {
      bindings[removes[index]].remove()
    }
  }

  const destroy = () => root.destroy()

  return {
    create,
    update,
    destroy
  }
}