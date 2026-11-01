import { Meta } from "../abstracts/meta.js"
import { Factories } from "../factories/factories.js"

export function $Instantiate<V extends Meta>(view: V, factories: Factories): Meta {
  function copy(view: Record<string, any>): Meta {
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

  function deepcopy(view: Record<string, any>, cache: WeakMap<Record<string, any>, Meta>): Meta {
    if (cache.has(view)) {
      return cache.get(view)!
    }

    const instance = copy(view) as Record<string, any>

    cache.set(view, instance as Meta)

    for (const key in view.meta.source.links) {
      instance[key] = deepcopy(view[key], cache)
    }

    return instance as Meta
  }

  function instantiate(view: Record<string, any>, seen: Set<Record<string, any>>): void {
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