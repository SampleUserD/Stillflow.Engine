export type Binding<T, V> = {
  create: (root: T) => T
  update: (context: V, root: T) => void,
  destroy: (root: T) => void
}