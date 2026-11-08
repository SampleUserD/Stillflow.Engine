import { AbstractCollection } from "./abstract/collection.js"
import { Fenwick } from "./utilities/fenwick-tree.js"

export class FenwickCollection<T> implements AbstractCollection<T> {
  private static GROW = 2
  private static REMOVE_COUNT = 1

  private _removes: Set<number> = new Set()
  private _tree: Fenwick

  private _shift: number = 0
  private _data: T[]

  public constructor(private _size: number = 1) {
    this._data = new Array<T>()
    this._tree = new Fenwick(this._size)
  }

  public at(index: number): T {
    return this._data[index + this._shift]
  }

  public map(id: number): number {
    let physical_index = 0
    let step = 1

    // Находим наибольшую степень двойки <= size
    while (step * 2 <= this._size) {
      step *= 2
    }

    for (let index = step; index > 0; index >>= 1) {
      const next = physical_index + index

      // Не выходим за границы данных
      if (next <= this._data.length) {
        // count(next) теперь корректен благодаря двойному Фенвику
        const removed = this._tree.count(next)
        const logical = next - removed

        if (logical <= id) {
          physical_index = next
        }
      }
    }

    return physical_index + this._shift
  }

  public set(index: number, value: T): void {
    this._data[index + this._shift] = value
  }

  public add(value: T): void {
    const index = this._data.push(value)

    if (index >= this._size) {
      this._tree = this._tree.grow(this._size)
      this._size *= FenwickCollection.GROW
    }
  }

  public swap(i: number, j: number): void {
    const temporary = this.at(i)

    this.set(i, this.at(j))
    this.set(j, temporary)
  }

  public attach(value: T[]): void {
    this._data = this._data.concat(value)

    const index = this._data.length

    while (index >= this._size) {
      this._tree = this._tree.grow(this._size)
      this._size *= FenwickCollection.GROW
    }
  }

  public mutate(index: number, mutator: (value: T) => void): void {
    mutator(this.at(index))
  }

  public shrink(): void {
    this._data.splice(0, this._shift)
    this._shift = 0

    const removes = Array.from(this._removes).sort((i, j) => j - i)

    for (const id of removes) {
      this._data.splice(id, 1)
    }

    this._removes.clear()

    this._size = this._data.length + 1
    this._tree = new Fenwick(this._size)
  }

  public mark_cleared(): void {
    this._shift = this._data.length
    this._size = this._data.length + 1

    this._removes.clear()

    this._tree = new Fenwick(this._size)
  }

  public mark_removed(index: number): void {
    this.mark_removed_range(index, index)
  }

  public mark_removed_range(left: number, right: number): void {
    if (left > right) {
      return
    }

    for (let index = left; index <= right; index++) {
      if (this._removes.has(index) === false) {
        this._tree.add(index, FenwickCollection.REMOVE_COUNT)
        this._removes.add(index)
      }
    }
  }

  public get size(): number {
    return this._data.length - this._shift - this._tree.count(this._data.length - this._shift)
  }

  public get capacity(): number {
    return this._size
  }
}