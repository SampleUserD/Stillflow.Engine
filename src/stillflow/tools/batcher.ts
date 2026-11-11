type Strategy = (site: () => void) => void

export class Batcher {
  private _commiting: boolean = false
  private _tasks: Set<() => void> = new Set()

  public constructor(private _strategy: Strategy) { }

  public task(task: () => void) {
    this._tasks.add(task)

    if (this._commiting) {
      return
    }

    this._commiting = true

    this._strategy(() => {
      for (const task of this._tasks) {
        task()
      }

      this._commiting = false
    })
  }
}