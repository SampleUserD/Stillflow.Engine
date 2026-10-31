import { Meta } from "../abstracts/meta.js"
import { Factories } from "../factories/factories.js"

type Mapping = Record<string, any>

export function $Instantiate<V extends Mapping>(view: V, factories: Factories): Meta {
  const instance: Mapping & Meta = {
    ...view,
    meta: {
      ...view.meta,
      as: {
        ...view.meta.as
      }
    }
  }

  for (const key in instance.meta.behaviors) {
    instance[key] = factories.get(instance.meta.behaviors[key], instance);
  }

  return instance
}