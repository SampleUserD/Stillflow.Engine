import { AbstractCollection } from "./abstract/collection.js"
import { Delta, clear_delta } from "./delta.js"

export class FlushableCollection<T> implements AbstractCollection<T> {
  private _front: Delta = {
    addes: 0,
    swaps: new Map(),
    updates: new Set(),
    removes: new Set(),
    replaces: false,
    clears: false
  }

  private _back: Delta = {
    addes: 0,
    swaps: new Map(),
    updates: new Set(),
    removes: new Set(),
    replaces: false,
    clears: false
  }

  public constructor(private _base: AbstractCollection<T>) { }

  public unmap(index: number): number {
    return this._base.unmap(index)
  }

  public at(index: number): T {
    return this._base.at(index)
  }

  public map(id: number): number {
    return this._base.map(id)
  }

  public add(value: T): void {
    this._front.addes++

    this._base.add(value)
  }

  public set(index: number, value: T): void {
    this._front.updates.add(index)

    this._base.set(index, value)
  }

  public swap(i: number, j: number): void {
    this._front.swaps.set(i, j)
    this._base.swap(i, j)
  }

  public attach(value: T[]): void {
    this._front.addes += value.length
    this._base.attach(value)
  }

  public mutate(index: number, mutator: (value: T) => void): void {
    this._front.updates.add(index)
    this._base.mutate(index, mutator)
  }

  public shrink(): void {
    this._base.shrink()
  }

  public mark_cleared(): void {
    this._front.clears = true
    this._base.mark_cleared()
  }

  public mark_removed(index: number): void {
    this._front.removes.add(index)
    this._base.mark_removed(index)
  }

  public mark_removed_range(left: number, right: number): void {
    for (let index = left; index <= right; index++) {
      this._front.removes.add(index)
    }

    this._base.mark_removed_range(left, right)
  }

  public flush(): Delta {
    this._front.replaces = (this._front.addes > 0) && (this._front.clears)

    const temporary = this._front
    this._front = this._back
    this._back = temporary

    clear_delta(this._front)

    return this._back
  }

  public get size(): number {
    return this._base.size
  }

  public get capacity(): number {
    return this._base.capacity
  }
}