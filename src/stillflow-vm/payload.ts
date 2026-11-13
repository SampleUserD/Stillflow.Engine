export class Payload {
  private _indices = new Map<any, number>()
  private _index = 0

  public payload(index: number): string {
    return `p${index}`
  }

  public add(value: any): number {
    let payload_name = this._indices.get(value)

    if (payload_name === undefined) {
      payload_name = this._index++

      this._indices.set(value, payload_name)
    }

    return payload_name
  }

  public add_payload(value: any): string {
    return this.payload(this.add(value))
  }

  public get parameters() {
    return Array.from(this._indices.values()).map(index => this.payload(index))
  }

  public get values() {
    return Array.from(this._indices.keys())
  }
}