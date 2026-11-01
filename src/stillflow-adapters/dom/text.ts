import { Binding } from "../binding.js"

export function text<V>(getter: (view: V) => string): Binding<Text, V> {
  const text = document.createTextNode(String())

  const create = () => text

  const update = (context: V, root: Text) => root.nodeValue = getter(context)

  const destroy = () => text.remove()

  return {
    create,
    update,
    destroy
  }
}
