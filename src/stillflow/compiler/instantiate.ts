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

  function deepcopy(view: Meta, cache: WeakMap<Meta, Meta>): Meta {
    if (cache.has(view)) {
      return cache.get(view)!
    }

    const instance = copy(view)

    cache.set(view, instance)

    for (const key in view.meta.source.links) {
      instance[key] = deepcopy(view[key], cache)
    }

    return instance
  }

  function instantiate(view: Meta): void {
    for (const key in view.meta.behaviors) {
      view[key] = factories.get(view.meta.behaviors[key], view)
    }

    for (const key in view.meta.source.links) {
      instantiate(view[key])
    }
  }

  const instance = deepcopy(view, new WeakMap())

  view.meta.instantiated = true

  instantiate(instance)

  return instance
}