import { Meta } from "../abstracts/meta.js"
import { Factories } from "../factories/factories.js"

export function $Instantiate<V extends Meta>(view: V, factories: Factories): Meta {
  function copy(view: Meta): Meta {
    return {
      ...view,
      meta: {
        ...view.meta,
        behaviors: {
          ...view.meta.behaviors
        }
      }
    }
  }

  function instantiate(view: Meta, seen: Set<Meta>): Meta {
    if (seen.has(view) || view.meta.instantiated) {
      return
    }

    seen.add(view)

    const instance = copy(view)

    for (const key in instance.meta.behaviors) {
      instance[key] = factories.get(instance.meta.behaviors[key], instance)
    }

    for (const key in instance) {
      if (key === 'meta') {
        continue
      }

      if (typeof instance[key] === 'object') {
        instance[key] = instantiate(instance[key], seen)
      }
    }

    view.meta.instantiated = true
  }

  return instantiate(view, new Set())
}