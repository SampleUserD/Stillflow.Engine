import { LogicalIndex, PhysicalIndex, as_logical, as_physical } from "@/stillflow-collection/abstract/collection.index.js"
import { GleeCollection } from "@/stillflow-collection/abstract/collection.glee.js"
import { Fenwick } from "./utilities/fenwick-tree.js"

export class FenwickCollection<T> extends GleeCollection<T> {
  private static GROW = 2
  private static REMOVE_COUNT = 1

  private _removes: Set<number> = new Set()
  private _tree: Fenwick

  private _shift: number = 0
  private _data: T[]

  public constructor(private _size: number = 1) {
    super()

    this._data = new Array<T>()
    this._tree = new Fenwick(this._size)
  }

  public $to_logical(index: PhysicalIndex): LogicalIndex {
    const removed_count = index > 0 ? this._tree.count(index - 1) : 0

    return as_logical(index - removed_count)
  }

  public $to_physical(id: LogicalIndex): PhysicalIndex {
    let physical_index = 0
    let step = 1

    const active_length = this._data.length - this._shift

    // Находим наибольшую степень двойки <= size
    while (step * 2 < active_length) {
      step *= 2
    }

    for (let index = step; index > 0; index >>= 1) {
      const next = physical_index + index

      // Не выходим за границы данных
      if (next < active_length) {
        // count(next) теперь корректен благодаря двойному Фенвику
        const removed = this._tree.count(next - 1)
        const logical = next - removed

        if (logical <= id) {
          physical_index = next
        }
      }
    }

    return as_physical(physical_index)
  }

  public $at(id: PhysicalIndex): T {
    return this._data[id + this._shift]
  }

  public $set(id: PhysicalIndex, value: T): void {
    this._data[id + this._shift] = value
  }

  public $swap(i: PhysicalIndex, j: PhysicalIndex): void {
    const temporary = this.$at(i)

    this.$set(i, this.$at(j))
    this.$set(j, temporary)
  }

  public $mutate(index: PhysicalIndex, mutator: (value: T) => void): void {
    mutator(this.$at(index))
  }

  public shrink(): void {
    this._data.splice(0, this._shift)
    this._shift = 0

    const removes = Array.from(this._removes).sort((i, j) => j - i)

    for (const id of removes) {
      this._tree.add(id, -FenwickCollection.REMOVE_COUNT)
      this._data.splice(id, 1)
    }

    this._removes.clear()
  }

  public clear(): void {
    this._shift = this._data.length
    this._size = this._data.length + 1

    for (const id of this._removes) {
      this._tree.add(id, -FenwickCollection.REMOVE_COUNT)
    }

    this._removes.clear()
  }

  public add(value: T): void {
    const index = this._data.push(value)

    if (index >= this._size) {
      this._tree = this._tree.grow(this._size)
      this._size *= FenwickCollection.GROW
    }
  }

  public attach(value: T[]): void {
    this._data = this._data.concat(value)

    const index = this._data.length

    while (index >= this._size) {
      this._tree = this._tree.grow(this._size)
      this._size *= FenwickCollection.GROW
    }
  }

  public $remove(id: PhysicalIndex): void {
    if (this._removes.has(id) === false) {
      this._tree.add(id, FenwickCollection.REMOVE_COUNT)
      this._removes.add(id)
    }
  }

  public $remove_range(left: PhysicalIndex, right: PhysicalIndex): void {
    if (left > right) {
      return
    }

    for (let index = left; index <= right; index++) {
      this.$remove(index)
    }
  }

  public get $size(): number {
    return this._data.length - this._shift - this._tree.count(this._data.length - this._shift)
  }

  public get $capacity(): number {
    return this._size
  }
}