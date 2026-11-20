import { LogicalIndex, PhysicalIndex } from "@/stillflow-collection/abstract/collection.index";

export interface LogicalCollection<T> {
  at(id: LogicalIndex): T

  add(value: T): void

  set(id: LogicalIndex, value: T): void

  swap(i: LogicalIndex, j: LogicalIndex): void

  clear(): void

  mutate(id: LogicalIndex, mutator: (value: T) => void): void

  attach(value: T[]): void

  remove(id: PhysicalIndex): void

  remove_range(left: PhysicalIndex, right: PhysicalIndex): void

  get size(): number
}