import * as vm from '@vm/index'
import { Template } from "@/stillflow-aot/dom/dom.template"
import { EventDelegator } from '@/stillflow-aot/dom/utilities/dom.delegator'

export interface Context extends Template {
  payload: vm.Payload,
  delegator: EventDelegator
}