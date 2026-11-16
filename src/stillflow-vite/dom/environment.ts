import * as vm from '@/stillflow-vite/babel-vm/index'

import { Template } from "@/stillflow-vite/dom/build-vm/template"
import { TransformResult } from "@/stillflow-vite/dom/build-vm/transform"
import { NodePath, PluginPass, Scope, types } from "@babel/core"

export interface ComponentInformation {
  node: types.Node,
  parameters: types.Identifier[],
  body: types.JSXElement,
  filename: string,
  scope: Scope | null
}

export interface ImportInformation {
  source: string,
  imported_name: string,
  is_default: boolean
}

export interface Environment extends PluginPass {
  elements: NodePath<types.JSXElement>[],
  components: Map<string, ComponentInformation>,
  template_map: Map<Template, number>,
  transform_map: Map<TransformResult, number>
}