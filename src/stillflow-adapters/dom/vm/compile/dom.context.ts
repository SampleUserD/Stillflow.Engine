import { vm } from "../../../../index.js"
import { Template } from "../dom.template.js"
import { AnyDOM } from "../dom.types.js"
import { EventDelegator } from "../utilities/dom.delegator.js"

export type Context = {
  node: AnyDOM<any>,
  payload: vm.Payload,
  strings: string[]
  functions: Function[],
  templates: Template[],
  delegator: EventDelegator,
} 