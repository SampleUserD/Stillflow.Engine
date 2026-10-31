import { Signal } from "./signal.js"
import { Buffer } from "./buffer.js"
import { AbstractState } from "../abstracts/state.js"

type Mapping = Record<string, any>

export class Kernel<T extends Mapping = Mapping> implements AbstractState<T> {
  private _commiting: boolean = false

  private _before = new Signal<void>()
  private _after = new Signal<void>()

  public constructor(private _buffer: Buffer<T>) { }

  public before(site: () => void): () => void {
    return this._before.subscribe(site)
  }

  public after(site: () => void): () => void {
    return this._after.subscribe(site)
  }

  public write<K extends keyof T>(path: K, value: T[K]): void {
    this._buffer.write(path, value)
  }

  public read<K extends keyof T>(path: K): T[K] {
    return this._buffer.read(path)
  }

  public remove<K extends keyof T>(path: K): void {
    this._buffer.remove(path)
  }

  public commit(): void {
    if (this._commiting) {
      throw new Error(`Can not "kernel.commit()" within commit`)
    }

    this._commiting = true

    this._before.dispatch()
    this._buffer.commit()
    this._after.dispatch()

    this._commiting = false
  }
}