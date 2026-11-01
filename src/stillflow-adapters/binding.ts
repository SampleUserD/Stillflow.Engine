export type Binding<T, V> = {
  create: () => T
  update: (context: V, root: T) => void,
  destroy: () => void
}