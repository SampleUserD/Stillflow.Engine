import { AbstractCollection } from "./abstract/collection.js"
import { Fenwick } from "./utilities/fenwick-tree.js"

export class FenwickCollection<T> implements AbstractCollection<T> {
  private static GROW = 2
  private static REMOVE_COUNT = 1

  private _removes = new Set<number>()

  private _data: T[]
  private _tree: Fenwick
  private _shift: number = 0

  public constructor(private _size: number = 1) {
    this._data = new Array<T>()
    this._tree = new Fenwick(this._size)
  }

  public at(index: number): T {
    return this._data[index + this._shift]
  }

  public map(id: number): number {
    return id - this._tree.count(id)
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
    const index = this._data.length + value.length - 1

    this._data = this._data.concat(value)

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

    for (const index of this._removes) {
      this._data.splice(index, FenwickCollection.REMOVE_COUNT)
    }
  }

  public mark_cleared(): void {
    for (const index of this._removes) {
      this._tree.add(index, -FenwickCollection.REMOVE_COUNT)
    }

    this._removes.clear()
    this._shift = this._data.length
  }

  public mark_removed(index: number): void {
    if (this._removes.has(index)) {
      return
    }

    this._tree.add(index, FenwickCollection.REMOVE_COUNT)
    this._removes.add(index)
  }

  public get size(): number {
    return this.total - this._tree.count(this.total)
  }

  public get total(): number {
    return this._data.length - this._shift
  }

  public get capacity(): number {
    return this._size
  }
}