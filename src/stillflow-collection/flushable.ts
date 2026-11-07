import { AbstractCollection } from "./abstract/collection.js"
import { Delta, clear_delta, copy_delta } from "./delta.js"

export class FlushableCollection<T> implements AbstractCollection<T> {
  private _delta: Delta = {
    addes: 0,
    swaps: new Map(),
    updates: new Set(),
    removes: new Set(),
    replaces: false,
    clears: false
  }

  public constructor(private _base: AbstractCollection<T>) { }

  public at(index: number): T {
    return this._base.at(index)
  }

  public map(id: number): number {
    return this._base.map(id)
  }

  public add(value: T): void {
    this._delta.addes++

    this._base.add(value)
  }

  public set(index: number, value: T): void {
    this._delta.updates.add(index)

    this._base.set(index, value)
  }

  public swap(i: number, j: number): void {
    this._delta.swaps.set(i, j)
    this._base.swap(i, j)
  }

  public attach(value: T[]): void {
    this._delta.addes += value.length
    this._base.attach(value)
  }

  public mutate(index: number, mutator: (value: T) => void): void {
    this._delta.updates.add(index)
    this._base.mutate(index, mutator)
  }

  public shrink(): void {
    this._base.shrink()
  }

  public mark_cleared(): void {
    this._delta.clears = true
    this._base.mark_cleared()
  }

  public mark_removed(index: number): void {
    this._delta.removes.add(index)
    this._base.mark_removed(index)
  }

  public flush(): Delta {
    this._delta.replaces = (this._delta.addes > 0) && (this._delta.clears)

    const delta = copy_delta(this._delta)

    clear_delta(this._delta)

    return delta
  }

  public get size(): number {
    return this._base.size
  }

  public get total(): number {
    return this._base.total
  }

  public get capacity(): number {
    return this._base.capacity
  }
}