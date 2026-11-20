import type { CounterFactory, Counter } from "@/stillflow-vite/vm-abstract"
import { types } from "@babel/core"

export class SequentalCounter implements Counter {
  private _counter: number = 0

  public constructor(private _prefix: string) { }

  public next(): number {
    return this._counter++
  }

  public identifier(): types.Identifier {
    return types.identifier(`${this._prefix}_${this.next()}`)
  }
}

export class SequentalCounterFactory implements CounterFactory {
  private _counters = new Map<string, SequentalCounter>()

  public create(prefix: string): Counter {
    if (this._counters.has(prefix)) {
      return this._counters.get(prefix)!
    }

    const counter = new SequentalCounter(prefix)

    this._counters.set(prefix, counter)

    return counter
  }

  public clear(): void {
    this._counters.clear()
  }
}