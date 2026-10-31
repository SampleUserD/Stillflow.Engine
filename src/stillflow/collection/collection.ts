import { Fenwick } from "./fenwick.js"

export class Collection<T> {
  private static GROW: number = 2

  private _fenwick: Fenwick
  private _removes: Uint8Array

  private _updated = new Set<number>()
  private _removed = new Set<number>()

  public constructor(private _data: T[], private _size: number) {
    this._fenwick = new Fenwick(this._size)
    this._removes = new Uint8Array(this._size)
  }

  public index(id: number): number {
    return id - this._fenwick.count(id)
  }

  public get(id: number): T {
    return this._data[id]
  }

  public set(id: number, value: T): void {
    this._updated.add(id)
    this._data[id] = value
  }

  public mutate(id: number, mutator: (item: T) => void): void {
    this._updated.add(id)
    mutator(this._data[id])
  }

  public remove(id: number): void {
    if (this._removes[id]) {
      return
    }

    this._fenwick.add(id, 1)
    this._removed.add(id)
    this._removes[id] = 1
  }

  public swap(i: number, j: number): void {
    const temporary = this.get(i)

    this.set(i, this.get(j))
    this.set(j, temporary)
  }

  public add(value: T): void {
    const index = this._data.push(value)

    if (index >= this._size) {
      this._fenwick = this._fenwick.grow(this._size)
      this._size *= Collection.GROW
    }
  }

  public flush() {
    const updates = Array.from(this._updated)
    const removes = Array.from(this._removed)

    this._updated.clear()
    this._removed.clear()

    return { updates, removes }
  }

  public size() {
    return this.total_size - this._fenwick.count(this.total_size)
  }

  public get total_size() {
    return this._data.length
  }
}