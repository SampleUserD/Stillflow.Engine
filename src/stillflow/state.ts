import { AbstractState } from "./abstracts/state.js"

type Mapping = Record<string, any>

export class State<T extends Mapping = Mapping> implements AbstractState<T> {
  private _state = new Map<keyof T, T[keyof T]>()

  public write<K extends keyof T>(path: K, value: T[K]): void {
    this._state.set(path, value)
  }

  public read<K extends keyof T>(path: K): T[K] {
    return this._state.get(path) as T[K]
  }

  public remove<K extends keyof T>(path: K): void {
    this._state.delete(path)
  }
}