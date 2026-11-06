import { Stillflow } from "../stillflow/stillflow.js"

type Mapping = Record<string, any>

type Strategy = (site: () => void) => void

export class Batcher<P extends Mapping = Mapping> {
  private _commiting: boolean = false
  private _buffer: ReturnType<typeof this._core.buffer>

  public constructor(private _core: Stillflow<P>, private _strategy: Strategy) {
    this._buffer = this._core.buffer()
  }

  public update(updater: () => void) {
    this._core.bind(this._buffer)

    updater()

    if (this._commiting) {
      return
    }

    this._commiting = true

    this._strategy(() => {
      this._core.commit()
      this._commiting = false
    })
  }
}