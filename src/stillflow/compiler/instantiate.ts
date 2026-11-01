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

  function instantiate(view: Meta, seen: Set<Meta>): void {
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

  const instance = deepcopy(view, new WeakMap())

  instantiate(instance, new Set())

  return instance
}