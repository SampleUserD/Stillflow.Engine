import { LogicalIndex, PhysicalIndex } from "@/stillflow-collection/abstract/collection.index"

export interface PhysicalCollection<T> {
  $to_logical(index: PhysicalIndex): LogicalIndex

  $to_physical(id: LogicalIndex): PhysicalIndex

  $at(index: PhysicalIndex): T

  $set(index: PhysicalIndex, value: T): void

  $swap(i: PhysicalIndex, j: PhysicalIndex): void

  $mutate(index: PhysicalIndex, mutator: (value: T) => void): void

  $remove(index: PhysicalIndex): void

  $remove_range(left: PhysicalIndex, right: PhysicalIndex): void

  shrink(): void

  get $size(): number
}