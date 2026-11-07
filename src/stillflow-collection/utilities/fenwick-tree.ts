export class Fenwick {
  private _tree: number[]

  public constructor(private _size: number, old_tree: number[] = []) {
    this._tree = old_tree.concat(new Array(this._size - old_tree.length).fill(0))
  }

  public get(index: number): number {
    return this._tree[index]
  }

  public add(start: number, delta: number): void {
    for (let index = start + 1; index <= this._size; index += index & -index) {
      this._tree[index] += delta
    }
  }

  public count(end: number): number {
    let amount = 0

    for (let index = end; index > 0; index -= index & -index) {
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