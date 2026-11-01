import { Binding } from "../binding.js"
import { Collection } from "../../index.js"

type CollectionProperties<T, V> = {
  root: Binding<any, any>,
  select: (context: T) => Collection<V>,
  each: () => Binding<any, V>
}

export function collection<V, T>(properties: CollectionProperties<T, V>): Binding<HTMLElement, T> {
  const { root, select, each } = properties

  const template_binding = each()
  const bindings: HTMLElement[] = []

  let pool: HTMLElement[] = []
  let old_size = 0

  const create = () => root.create(root)

  const update = (context: T, root: HTMLElement) => {
    const items = select(context)
    const { updates, removes, cleares } = items.flush()

    const fragment = document.createDocumentFragment()

    if (cleares) {
      pool = pool.concat(...bindings.splice(0))

      root.innerHTML = String()
      old_size = 0
    }

    for (let index = old_size; index < items.total_size; index++) {
      const element = pool.pop() || template_binding.create(root.childNodes[index]).cloneNode(true)

      bindings.push(element)

      template_binding.update(items.at(index), element)

      fragment.appendChild(element)
    }

    root.appendChild(fragment)

    old_size = items.total_size

    for (let index = 0; index < updates.length; index++) {
      template_binding.update(items.at(updates[index]), bindings[updates[index]])
    }

    for (let index = 0; index < removes.length; index++) {
      const node = bindings[removes[index]]

      node.remove()
      pool.push(node)
    }
  }

  const destroy = () => {
    pool.length = 0
    bindings.length = 0
    root.destroy(root)
  }

  return {
    create,
    update,
    destroy
  }
}