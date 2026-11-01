export type Binding<T, V> = {
  create: (context: V) => T
  update: (context: V) => void,
  destroy: () => void
}