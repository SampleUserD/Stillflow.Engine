export class Emitter {
  private _code: number[] = []

  public emit(operation: number, ...args: number[]): void {
    this._code.push(args.length + 2, operation, ...args)
  }

  public finish(): Uint16Array {
    return new Uint16Array(this._code.concat([0]))
  }
}