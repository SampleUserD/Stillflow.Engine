import { LogicalIndex, PhysicalIndex, as_logical, as_physical } from "@/stillflow-collection/abstract/collection.index";
import { LogicalCollection } from "@/stillflow-collection/abstract/collection.logical"
import { PhysicalCollection } from "@/stillflow-collection/abstract/collection.physical"

export abstract class GleeCollection<T> implements PhysicalCollection<T>, LogicalCollection<T> {
  public abstract $to_logical(index: PhysicalIndex): LogicalIndex

  public abstract $to_physical(id: LogicalIndex): PhysicalIndex

  public abstract $at(index: PhysicalIndex): T

  public abstract $set(index: PhysicalIndex, value: T): void

  public abstract $swap(i: PhysicalIndex, j: PhysicalIndex): void

  public abstract $mutate(index: PhysicalIndex, mutator: (value: T) => void): void

  public abstract $remove(index: PhysicalIndex): void

  public abstract $remove_range(left: PhysicalIndex, right: PhysicalIndex): void

  public abstract shrink(): void

  public at(id: LogicalIndex): T {
    return this.$at(this.$to_physical(id))
  }

  public set(id: LogicalIndex, value: T): void {
    this.$set(this.$to_physical(id), value)
  }

  public swap(i: LogicalIndex, j: LogicalIndex): void {
    this.$swap(this.$to_physical(i), this.$to_physical(j))
  }

  public mutate(id: LogicalIndex, mutator: (value: T) => void): void {
    this.$mutate(this.$to_physical(id), mutator)
  }

  public remove(id: PhysicalIndex): void {
    this.$remove(id)
  }

  public remove_range(left: PhysicalIndex, right: PhysicalIndex): void {
    this.$remove_range(left, right)
  }

  public abstract add(value: T): void

  public abstract attach(value: T[]): void

  public abstract clear(): void

  public abstract get $size(): number

  public get size(): number {
    return this.$size
  }
}