export class BytecodeResource<T> {
  private _resource: T[] = []

  public get(index: number): T {
    return this._resource[index]
  }

  public add(resource: T): number {
    return this._resource.push(resource) - 1
  }
}

export class BytecodeResources {
  private _resources: Map<string, BytecodeResource<any>> = new Map()

  public allocate<T>(category: string) {
    if (this._resources.has(category) === true) {
      return this._resources.get(category)!
    }

    const resource = new BytecodeResource<T>()

    this._resources.set(category, resource)

    return resource
  }

  public get<T>(category: string, index: number): T {
    return this.allocate(category).get(index) as T
  }

  public add<T>(category: string, resource: T): number {
    return this.allocate(category).add(resource)
  }
}