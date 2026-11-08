export class Fenwick {
  private _tree: Int32Array

  public constructor(private _size: number, old: Int32Array = new Int32Array(0)) {
    this._tree = new Int32Array(this._size + 1)
    this._tree.set(old)
  }

  public add(start: number, delta: number): void {
    for (let index = start + 1; index <= this._size; index += index & -index) {
      this._tree[index] += delta
    }
  }

  public count(end: number): number {
    let amount = 0

    for (let index = end + 1; index > 0; index -= index & -index) {
      amount += this._tree[index]
    }

    return amount
  }

  public grow(length: number): Fenwick {
    return new Fenwick(this._size + length, this._tree)
  }

  public get size() {
    return this._size
  }
}