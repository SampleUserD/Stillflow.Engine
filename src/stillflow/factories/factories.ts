type Mapping = Record<string, any>

export class Factories {
  private _factories = new Map<string, (view: any, factories: Factories) => any>()

  public constructor(private _parent: Factories | null = null) { }

  public add<T, V extends Mapping>(type: string, factory: (view: V, factories: Factories) => T): void {
    this._factories.set(type, factory)
  }

  public get<T, V extends Mapping>(type: string, view: V): T {
    const factory = this._factories.get(type)

    if (factory === undefined) {
      return this._parent?.get<T, V>(type, view)!
    }

    return factory(view, this)
  }

  public make(): Factories {
    return new Factories(this)
  }
}