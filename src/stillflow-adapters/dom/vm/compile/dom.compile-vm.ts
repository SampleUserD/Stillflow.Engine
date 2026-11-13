import * as vm from "../../../../stillflow-vm/index.js"

import { Pool } from "../utilities/dom.pool.js"
import { Codes } from "../dom.codes.js"
import { Context } from "./dom.context.js"
import { Template } from "../dom.template.js"
import { EventDelegator } from "../utilities/dom.delegator.js"
import { SF_ANY, SF_CACHE, SF_CACHE_TEXT, SF_CONTEXT, SF_HANDLERS, SF_LISTENED } from "../dom.symbols.js"
import { markup_template } from "./dom.markup.js"

const generators: vm.Config<Context>['generators'] = {
  [Codes.VM](bytecode, offset, context) {
    const anchor = bytecode[offset + 2]
    const select = context.functions[bytecode[offset + 2]]
    const node = context.nodes[bytecode[offset + 3]]

    const selectIndex = context.payload.add_payload(select)
    const nodeIndex = context.payload.add_payload(node)

    const slotIndex = context.payload.add_payload({
      active: undefined as undefined | vm.Compiler,
      cache: new Map<vm.Compiler, any>()
    })

    let code = String()

    code += `{`
    code += `const compile = ${selectIndex}(context);`
    code += `if (${slotIndex}.active !== undefined) {`
    code += `${slotIndex}.active.root.remove();`
    code += `}`
    code += `let next = ${slotIndex}.cache.get(compile);`
    code += `if (next === undefined) {`
    code += `next = compile(${nodeIndex});`
    code += `${slotIndex}.cache.set(compile, next);`
    code += `}`
    code += `${slotIndex}.active = next;`
    code += `if (next !== undefined) {`
    code += `const anchor = sf_node_cache[${anchor}];`
    code += `anchor.parentNode.insertBefore(next.root, anchor);`
    code += `}`
    code += `if (${slotIndex}.active !== undefined) {`
    code += `${slotIndex}.active.applier(${slotIndex}.active.root, context);`
    code += `}`
    code += `}`

    return code
  },
  [Codes.PROPERTY](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const property = context.strings[bytecode[offset + 3]]
    const handler = context.functions[bytecode[offset + 4]]

    const propertyIndex = context.payload.add(property)
    const handlerIndex = context.payload.add(handler)

    const payload = context.payload.payload

    return `sf_node_cache[${container}][${payload(propertyIndex)}] = ${payload(handlerIndex)}(context);`
  },
  [Codes.TEXT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]

    const handlerIndex = context.payload.add(handler)

    return `sf_text_cache[${container}].data = ${context.payload.payload(handlerIndex)}(context);`
  },
  [Codes.EVENT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const event = context.strings[bytecode[offset + 3]]
    const handler = context.functions[bytecode[offset + 4]]

    const eventIndex = context.payload.add(event)
    const handlerIndex = context.payload.add(handler)
    const delegatorIndex = context.payload.add(context.delegator)

    const payload = context.payload.payload

    let code = String()

    code += `{`
    code += `const element = sf_node_cache[${container}];`
    code += `element.${SF_CONTEXT} = context;`
    code += `if (!element.${SF_LISTENED}) {`
    code += `element.${SF_LISTENED} = true;`
    code += `${payload(delegatorIndex)}.add(element, ${payload(eventIndex)}, ${payload(handlerIndex)});`
    code += `}`
    code += `}`

    return code
  },
  [Codes.IF](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]
    const payload = context.payload.payload

    let code = String()

    const handlerIndex = context.payload.add(handler)

    code += `{`
    code += `const element = sf_node_cache[${container}];`
    code += `const condition = ${payload(handlerIndex)}(context);`
    code += `element.style.display = condition ? String() : 'none';`
    code += `}`

    return code
  },
  [Codes.FOR](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const select = context.functions[bytecode[offset + 3]]
    const template = context.templates[bytecode[offset + 4]]

    const item_applier = run_dom_vm(template)

    item_applier(template.root, SF_ANY)

    const selectIndex = context.payload.add_payload(select)
    const applierIndex = context.payload.add_payload(item_applier)
    const templateIndex = context.payload.add_payload(template.root)
    const elementsIndex = context.payload.add_payload([])
    const poolIndex = context.payload.add_payload(new Pool())

    let code = String()

    code += `{`
    code += `const items = ${selectIndex}(context);`
    code += `const target = sf_node_cache[${container}];`
    code += `const { replaces, clears, addes, swaps, removes, updates } = items.flush();`
    code += `if (replaces) {`
    code += `const items_size = items.size;`
    code += `const children_size = ${elementsIndex}.length;`
    code += `const common_size = Math.min(items_size, children_size);`
    code += `for (let i = 0; i < common_size; i++) {`
    code += `${applierIndex}(${elementsIndex}[i], items.at(i));`
    code += `}`
    code += `if (items_size < children_size) {`
    code += `for (let i = items_size; i < children_size; i++) {`
    code += `const element = ${elementsIndex}[i];`
    code += `${poolIndex}.add(element);`
    code += `element.remove();`
    code += `}`
    code += `${elementsIndex}.length = items_size;`
    code += `}`
    code += `else if (children_size < items_size) {`
    code += `const fragment = document.createDocumentFragment();`
    code += `const elements = new Array(items_size - children_size);`
    code += `for (let i = children_size; i < items_size; i++) {`
    code += `const element = ${poolIndex}.get() || ${templateIndex}.cloneNode(true);`
    code += `element.${SF_HANDLERS} = ${templateIndex}.${SF_HANDLERS};`
    code += `element.${SF_CONTEXT} = items.at(i);`
    code += `${applierIndex}(element, items.at(i));`
    code += `elements[i - children_size] = element;`
    code += `fragment.appendChild(element);`
    code += `}`
    code += `${elementsIndex}.push(...elements);`
    code += `target.appendChild(fragment);`
    code += `}`
    code += `}`
    code += `else {`
    code += `if (clears) {`
    code += `const freelist = ${elementsIndex}.splice(0);`
    code += `for (const element of freelist) {`
    code += `element.${SF_HANDLERS} = undefined;`
    code += `${poolIndex}.add(element);`
    code += `}`
    code += `target.textContent = String();`
    code += `}`
    code += `if (addes > 0) {`
    code += `const fragment = document.createDocumentFragment();`
    code += `const elements = new Array(addes);`
    code += `const old_size = ${elementsIndex}.length;`
    code += `for (let i = 0; i < addes; i++) {`
    code += `const element = ${poolIndex}.get() || ${templateIndex}.cloneNode(true);`
    code += `element.${SF_HANDLERS} = ${templateIndex}.${SF_HANDLERS};`
    code += `element.${SF_CONTEXT} = items.at(i + old_size);`
    code += `${applierIndex}(element, items.at(i + old_size));`
    code += `elements[i] = element;`
    code += `fragment.appendChild(element);`
    code += `}`
    code += `${elementsIndex}.push(...elements);`
    code += `target.appendChild(fragment);`
    code += `}`
    code += `for (const [i, j] of swaps.entries()) {`
    code += `${applierIndex}(${elementsIndex}[i], items.at(i));`
    code += `${elementsIndex}[i].${SF_CONTEXT} = items.at(i);`
    code += `${applierIndex}(${elementsIndex}[j], items.at(j));`
    code += `${elementsIndex}[j].${SF_CONTEXT} = items.at(j);`
    code += `}`
    code += `for (const id of removes) {`
    code += `const element = ${elementsIndex}[id];`
    code += `element.${SF_HANDLERS} = undefined;`
    code += `${poolIndex}.add(element);`
    code += `element.remove();`
    code += `}`
    code += `for (const id of updates) {`
    code += `${applierIndex}(${elementsIndex}[id], items.at(id));`
    code += `}`
    code += `}`
    code += `${poolIndex}.tick();`
    code += `}`

    return code
  }
}

const DELEGATOR = new EventDelegator()

const create_context = (payload: vm.Payload, input: Template) => {
  return {
    node: input.node,
    nodes: input.nodes,
    payload,
    strings: input.strings,
    functions: input.functions,
    templates: input.templates,
    delegator: DELEGATOR
  }
}

const dom_vm = vm.create<Template, Context>({
  generators,
  preamble(context) {
    let code = String()

    const markupIndex = context.payload.add_payload(markup_template(context.node))

    code += `return function(root, context) {`
    code += `${markupIndex}(root);`
    code += `const sf_node_cache = root.${SF_CACHE};`
    code += `const sf_text_cache = root.${SF_CACHE_TEXT};`

    return code
  },
  epilogue() {
    return `}`
  },
})

export const run_dom_vm = (template: Template) => dom_vm(template.bytecode, template, create_context)