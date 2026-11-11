import { AbstractState } from "../abstracts/state.js"

type Mapping = Record<string, any>

export class Buffer<T extends Mapping = Mapping> {
  private _messages = new Map<keyof T, T[keyof T]>()

  public constructor() { }

  public write<K extends keyof T>(path: K, value: T[K]): void {
    this._messages.set(path, value)
  }

  public discard(): void {
    this._messages.clear()
  }

  public commit(state: AbstractState<T>): void {
    for (const [path, value] of this._messages.entries()) {
      state.write(path, value)
    }

    this._messages.clear()
  }
}