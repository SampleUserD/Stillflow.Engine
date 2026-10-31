export class Signal<T> {
  private _subscribers = new Set<(payload: T) => void>()

  public subscribe(site: (payload: T) => void): () => void {
    this._subscribers.add(site)

    return () => this._subscribers.delete(site)
  }

  public dispatch(payload: T) {
    for (const subscriber of this._subscribers) {
      subscriber(payload)
    }
  }
}