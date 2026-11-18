import type { BuildTimeDOMElement } from '@/stillflow-vite/dom/build-vm/build.dom'

import type { Template } from "@/stillflow-vite/dom/build-vm/template"
import type { TransformResult } from "@/stillflow-vite/dom/build-vm/transform"
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
  expanding: Set<string>,
  components: Map<string, ComponentInformation>,
  template_map: Map<Template, number>,
  transform_map: Map<TransformResult, number>,
  counters: Map<string, number>
}