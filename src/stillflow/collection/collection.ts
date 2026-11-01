import { Fenwick } from "./fenwick.js"

export class Collection<T> {
  private static GROW: number = 2

  private _fenwick: Fenwick

  private _updated = new Set<number>()
  private _removed = new Set<number>()
  private _cleared: number = 0

  private _cleared_since_flush: boolean = false

  public constructor(private _data: T[], private _size: number) {
    this._fenwick = new Fenwick(this._size)
  }

  public index(id: number): number {
    return id - this._fenwick.count(id)
  }

  public set(id: number, value: T): void {
    this._updated.add(id)
    this._data[id + this._cleared] = value
  }

  public mutate(id: number, mutator: (item: T) => void): void {
    this._updated.add(id)
    mutator(this._data[id + this._cleared])
  }

  public remove(id: number): void {
    if (this._fenwick.count(id + 1) - this._fenwick.count(id)) {
      return
    }

    this._fenwick.add(id, 1)
    this._removed.add(id)
  }

  public swap(i: number, j: number): void {
    const temporary = this.at(i)

    this.set(i, this.at(j))
    this.set(j, temporary)
  }

  public add(value: T): void {
    const index = this._data.push(value) - this._cleared

    while (index >= this._size) {
      this._fenwick = this._fenwick.grow(this._size)
      this._size *= Collection.GROW
    }
  }

  public at(id: number): T {
    return this._data[id + this._cleared]
  }

  public clear(): void {
    this._updated.clear()
    this._removed.clear()

    this._fenwick = new Fenwick(this._size)
    this._cleared = this.total_size

    this._cleared_since_flush = true
  }

  public flush() {
    const updates = Array.from(this._updated)
    const removes = Array.from(this._removed)
    const cleares = this._cleared_since_flush

    this._updated.clear()
    this._removed.clear()
    this._cleared_since_flush = false

    return { updates, removes, cleares }
  }

  public size() {
    return this.total_size - this._fenwick.count(this.total_size)
  }

  public get total_size() {
    return this._data.length
  }

  public get capacity() {
    return this._size
  }
}