import * as vm from "@vm/index"
import { Template } from "../dom.template"
import { AnyDOM } from "../dom.types"
import { EventDelegator } from "../utilities/dom.delegator"

export type Context = {
  node: AnyDOM<any>,
  nodes: AnyDOM<any>[],
  payload: vm.Payload,
  strings: string[]
  functions: Function[],
  templates: Template[],
  delegator: EventDelegator,
} 