import { Meta } from "./abstracts/meta.js"
import { AbstractState } from "./abstracts/state.js"
import { View } from "./abstracts/view.js"
import { $Compile, $ProcessRead, $ProcessWrite } from "./compiler/compile.js"
import { $Instantiate } from "./compiler/instantiate.js"
import { Factories } from "./factories/factories.js"
import { Buffer } from "./kernel/buffer.js"
import { Kernel } from "./kernel/kernel.js"
import { Variable } from "./variable.js"
import { Batcher } from "./tools/batcher.js"

type Mapping = Record<string, any>

type Options = { strategy: (site: () => void) => void }

export class Stillflow<T extends Mapping = Mapping> {
  private _views: Set<Meta> = new Set()

  private _kernel: Kernel<T>

  private _batcher: Batcher

  public constructor(private _state: AbstractState<T>, private _options: Options = { strategy: (site) => site() }) {
    this._kernel = new Kernel(this._state)
    this._batcher = new Batcher(this._options.strategy)

    this._kernel.before(() => {
      for (const view of [...this._views]) {
        $ProcessWrite(this._kernel, view.meta.source, view)
      }
    })

    this._kernel.after(() => {
      for (const view of [...this._views]) {
        $ProcessRead(this._kernel, view.meta.source, view)
      }
    })
  }

  public on(site: () => void): () => void {
    return this._kernel.after(site)
  }

  public factory() {
    return new Factories()
  }

  public buffer(): Buffer<T> {
    return new Buffer()
  }

  public bind(buffer: Buffer<T>): void {
    this._kernel.bind(buffer)
  }

  public compile<V extends Mapping>(source: V): View<V, T> {
    const view = $Compile(this._kernel, source)

    this._views.add(view)

    return view
  }

  public instantiate<V extends Meta>(source: V, factory: Factories): V {
    const view = $Instantiate(source, factory) as V

    this._views.delete(source)
    this._views.add(view)

    return view
  }

  public commit(): void {
    this._batcher.task(() => this._kernel.commit())
  }

  public variable<K extends keyof T>(path: K): Variable<T, K> {
    return new Variable(this._kernel, path)
  }
}