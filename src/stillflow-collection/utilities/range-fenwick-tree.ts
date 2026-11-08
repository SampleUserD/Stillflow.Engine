import { Fenwick } from "./fenwick-tree.js"

export class RangeFenwick {
  private _size: number = 0

  public constructor(size: number, private _start = new Fenwick(size), private _end = new Fenwick(size)) {
    this._size = size
  }

  public add(left: number, right: number, delta: number = 1): void {
    this._start.add(left, delta)
    this._start.add(right + 1, -delta)

    this._end.add(left, delta * (left - 1))
    this._end.add(right + 1, -delta * right)
  }

  public count(index: number): number {
    const amount_0 = this._start.count(index)
    const amount_1 = this._end.count(index)

    return amount_0 * index - amount_1
  }

  public grow(length: number) {
    return new RangeFenwick(this._size + length, this._start.grow(length), this._end.grow(length))
  }

  public get size() {
    return this._size
  }
}