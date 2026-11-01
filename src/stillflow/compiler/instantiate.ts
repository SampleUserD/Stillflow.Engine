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

    for (const key in view.meta.behaviors) {
      view[key] = factories.get(view.meta.behaviors[key], view)
    }

    for (const key in view.meta.source.links) {
      instantiate(view[key], seen)
    }

    view.meta.instantiated = true
  }

  const instance = copy(view)

  instantiate(instance, new Set())

  return instance
}