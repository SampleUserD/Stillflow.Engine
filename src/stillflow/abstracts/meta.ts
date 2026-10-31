import { IR } from "./IR.js"

type Mapping = Record<string, any>

export type Meta = {
  meta: {
    behaviors: Record<string, string>,
    source: IR
  }
}