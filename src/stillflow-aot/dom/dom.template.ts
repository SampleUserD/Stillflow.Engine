import { types } from '@babel/core'
import { AnyDOM } from '@/stillflow-aot/dom/dom.types'
import { TransformResult } from "@/stillflow-aot/dom/transform/dom.transform"

export interface Template {
  root: TransformResult,
  node: AnyDOM<any>,
  nodes: AnyDOM<any>[],
  bytecode: ArrayLike<number>,
  strings: string[],
  functions: types.Node[],
  templates: Template[],
}