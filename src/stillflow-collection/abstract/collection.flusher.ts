import { Delta } from "@/stillflow-collection/abstract/collection.delta"

export interface Flusher<T> {
  flush(): Delta<T>

  at(id: number): T

  add(value: T): void

  set(id: number, value: T): void

  swap(i: number, j: number): void

  clear(): void

  mutate(id: number, mutator: (value: T) => void): void

  attach(value: T[]): void

  remove(id: number): void

  remove_range(left: number, right: number): void

  touch(id: number): void

  get size(): number
}