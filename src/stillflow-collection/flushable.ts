import { Delta, clear_delta } from "./abstract/collection.delta.js"
import { GleeCollection } from "@/stillflow-collection/abstract/collection.glee.js"
import { Flusher } from "@/stillflow-collection/abstract/collection.flusher.js"
import { as_logical, as_physical } from "@/stillflow-collection/index.js"

export class FlushableCollection<T> implements Flusher<T> {
  private _front: Delta<T> = {
    addes: 0,
    swaps: new Map(),
    updates: new Map(),
    removes: new Set(),
    replaces: false,
    clears: false
  }

  private _back: Delta<T> = {
    addes: 0,
    swaps: new Map(),
    updates: new Map(),
    removes: new Set(),
    replaces: false,
    clears: false
  }

  public constructor(private _base: GleeCollection<T>) { }

  public at(index: number): T {
    return this._base.at(as_logical(index))
  }

  public add(value: T): void {
    this._front.addes++

    this._base.add(value)
  }

  public set(index: number, value: T): void {
    this._base.set(as_logical(index), value)

    this.touch(index)
  }

  public swap(i: number, j: number): void {
    this._base.swap(as_logical(i), as_logical(j))

    this._front.swaps.set(this._base.$to_logical(as_physical(i)), this._base.$to_logical(as_physical(j)))
  }

  public attach(value: T[]): void {
    this._front.addes += value.length

    this._base.attach(value)
  }

  public mutate(index: number, mutator: (value: T) => void): void {
    this._base.mutate(as_logical(index), mutator)

    this.touch(index)
  }

  public shrink(): void {
    this._base.shrink()
  }

  public clear(): void {
    this._front.clears = true
    this._base.clear()
  }

  public touch(id: number): void {
    const index = this._base.$to_logical(as_physical(id))

    this._front.updates.set(index, this._base.at(index))
  }

  public remove(id: number): void {
    const index = this._base.remove(as_physical(id))

    this._front.removes.add(this._base.$to_logical(as_physical(id)))

    return index
  }

  public remove_range(left: number, right: number): void {
    for (let id = left; id <= right; id++) {
      this.remove(id)
    }
  }

  public flush(): Delta<T> {
    this._front.replaces = (this._front.addes > 0) && (this._front.clears)
    this._front.clears = (this._front.addes <= 0) && (this._front.clears)
    this._front.addes = this._front.replaces ? 0 : this._front.addes

    const temporary = this._front
    this._front = this._back
    this._back = temporary

    clear_delta(this._front)

    return this._back
  }

  public get size(): number {
    return this._base.size
  }
}