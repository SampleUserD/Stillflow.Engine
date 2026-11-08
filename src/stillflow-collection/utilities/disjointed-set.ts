export class DSU {
  private _parent: Int32Array

  public constructor(private _size: number, old: Int32Array = new Int32Array(0)) {
    this._parent = new Int32Array(this._size + 1)

    this._parent.set(old)

    for (let index = old.length; index <= this._size; index++) {
      this._parent[index] = index
    }
  }

  public find(index: number): number {
    if (index > this._size) {
      throw new Error(`Index ${index} out of bounds (size: ${this._size})`);
    }

    let root = index

    while (this._parent[root] !== root) {
      root = this._parent[root]
    }

    let current = index

    while (this._parent[current] !== root) {
      const next = this._parent[current]
      this._parent[current] = root
      current = next
    }

    return root;
  }

  public mark(left: number, right: number): void {
    let current = this.find(left)

    while (current <= right) {
      const next = this.find(current + 1)

      this._parent[current] = next

      current = next
    }
  }

  public is_marked(index: number): boolean {
    return this.find(index) !== index
  }

  public grow(length: number): DSU {
    return new DSU(this._size + length, this._parent)
  }

  public get size() {
    return this._size
  }
}