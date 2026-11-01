import { Properties } from "./properties.js"
import { collection } from "./collection.js"
import { HTML_TAGS } from "./tags.js"
import { delegate } from "./delegate.js"
import { Binding } from "../binding.js"
import { create } from "./create.js"
import { lens } from "./lens.js"
import { text } from "./text.js"

const dom: {
  [K in keyof HTMLElementTagNameMap]: <V>(
    properties: Properties<V, K>,
    update?: (context: V, root: HTMLElementTagNameMap[K]) => void
  ) => Binding<HTMLElementTagNameMap[K], V>
} & {
  text: typeof text,
  lens: typeof lens,
  delegate: typeof delegate
  collection: typeof collection,
} = Object.create(null)

for (const tag of HTML_TAGS) {
  (dom as any)[tag] = <V>(
    properties: Properties<V, typeof tag>,
    updates?: (context: V, root: HTMLElementTagNameMap[typeof tag]) => void
  ) => create(tag, properties, updates)
}

dom['text'] = text
dom['lens'] = lens
dom['collection'] = collection
dom['delegate'] = delegate

export { dom }