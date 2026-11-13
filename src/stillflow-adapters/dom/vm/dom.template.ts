import { AnyDOM } from "./dom.types.js"

export interface Template {
  node: AnyDOM<any>,
  root: HTMLElement,
  bytecode: ArrayLike<number>,
  strings: string[]
  functions: Function[],
  templates: Template[],
}