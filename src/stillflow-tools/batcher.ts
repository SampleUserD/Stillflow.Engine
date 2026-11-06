type Strategy = (site: () => void) => void

export class Batcher {
  private _commiting: boolean = false

  public constructor(private _strategy: Strategy) { }

  public task(task: () => void) {
    if (this._commiting) {
      return
    }

    this._commiting = true

    this._strategy(() => {
      task()
      this._commiting = false
    })
  }
}