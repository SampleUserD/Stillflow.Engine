import { Recursion, Toolkit } from "@/stillflow-vite/vm-abstract"

export class RecursionScoper implements Recursion {
  public constructor(private _toolkit: Toolkit) { }

  public is_recursive(path: string): boolean {
    return this._toolkit.stack.has(path)
  }

  public push(path: string): void {
    this._toolkit.stack.add(path)
  }

  public pop(path: string): void {
    this._toolkit.stack.delete(path)
  }

  public scope(path: string, site: (path: string) => void): void {
    this.push(path)

    site(path)

    this.pop(path)
  }
}