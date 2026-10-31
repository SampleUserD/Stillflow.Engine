import { Backref, Ref } from "./abstracts/operators.js"
import { Kernel } from "./kernel/kernel.js"

import operators from "./operators.js"

export class Variable<T extends Record<string, any>, P extends keyof T> {
  public constructor(private _kernel: Kernel<T>, private _key: P) { }

  public write(value: T[P]): void {
    this._kernel.write(this._key, value)
  }

  public read(): T[P] {
    return this._kernel.read(this._key)
  }

  public remove(): void {
    this._kernel.remove(this._key)
  }

  public ref(): Ref<T, P> {
    return operators.ref(this._key)
  }

  public backref(): Backref<T, P> {
    return operators.backref(this._key)
  }
}