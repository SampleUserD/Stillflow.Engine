import { Signal } from "./signal.js"
import { Buffer } from "./buffer.js"
import { AbstractState } from "../abstracts/state.js"

type Mapping = Record<string, any>

export class Kernel<T extends Mapping = Mapping> implements AbstractState<T> {
  private _before = new Signal<void>()
  private _after = new Signal<void>()

  private _commiting = false

  private _additional = new Buffer<T>()
  private _buffers = new Set<Buffer<T>>([this._additional])

  public constructor(private _state: AbstractState<T>) { }

  public bind(buffer: Buffer<T>): () => void {
    this._buffers.add(buffer)

    return () => this._buffers.delete(buffer)
  }

  public before(site: () => void): () => void {
    return this._before.subscribe(site)
  }

  public after(site: () => void): () => void {
    return this._after.subscribe(site)
  }

  public write<K extends keyof T>(path: K, value: T[K]): void {
    this._additional.write(path, value)
  }

  public read<K extends keyof T>(path: K): T[K] {
    return this._state.read(path)
  }

  public remove<K extends keyof T>(path: K): void {
    this._state.remove(path)
  }

  public commit(): void {
    if (this._commiting) {
      throw new Error(`Can not "kernel.commit()" within commit`)
    }

    this._commiting = true

    this._before.dispatch()

    for (const buffer of this._buffers) {
      buffer.commit(this._state)
    }

    this._after.dispatch()

    this._commiting = false
  }
}