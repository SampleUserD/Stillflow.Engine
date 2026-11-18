import * as vm from '@/stillflow-vite/babel-vm/index'

import { TransformResult } from "@/stillflow-vite/dom/build-vm/transform";
import { BuildTimeDOMElement } from '@/stillflow-vite/dom/build-vm/build.dom';
import { Environment } from '@/stillflow-vite/dom/environment';

export interface Template {
  root: TransformResult,
  node: BuildTimeDOMElement,
  nodes: BuildTimeDOMElement[],
  bytecode: ArrayLike<number>,
  strings: vm.Payload,
  functions: vm.Payload,
  templates: vm.Payload,
  environment: Environment
}
