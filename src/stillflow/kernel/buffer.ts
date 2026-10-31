import { AbstractState } from "../abstracts/state.js"

type Mapping = Record<string, any>

export class Buffer<T extends Mapping = Mapping> implements AbstractState<T> {
  private _messages = new Map<keyof T, T[keyof T]>()

  public constructor(private _state: AbstractState<T>) { }

  public write<K extends keyof T>(path: K, value: T[K]): void {
    this._messages.set(path, value)
  }

  public read<K extends keyof T>(path: K): T[K] {
    return this._state.read(path)
  }

  public remove<K extends keyof T>(path: K): void {
    this._state.remove(path)
  }

  public commit(): void {
    for (const [path, value] of this._messages.entries()) {
      this._state.write(path, value)
    }

    this._messages.clear()
  }
}