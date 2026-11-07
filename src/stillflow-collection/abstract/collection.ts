export interface AbstractCollection<T> {
  at(index: number): T

  map(id: number): number

  add(value: T): void

  set(index: number, value: T): void

  swap(i: number, j: number): void

  attach(value: T[]): void

  mutate(index: number, mutator: (value: T) => void): void

  shrink(): void

  mark_cleared(): void

  mark_removed(index: number): void

  get size(): number

  get total(): number

  get capacity(): number
}