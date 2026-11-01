import { Binding } from "../binding.js"

export function lens<T, W, V>(binding: Binding<T, W>, lens: (context: V) => W) {
  const create = () => binding.create()

  const update = (context: V, root: T) => binding.update(lens(context), root)

  const destroy = () => binding.destroy()

  return {
    create,
    update,
    destroy
  }
}