import { Pool } from "../dom.pool.js"
import { transform } from "../transformers/transform.js"
import { EventDelegator } from "../dom.delegator.js"
import { compile, markup_template, Instructions } from "../compiler/compile.js"
import { SF_CACHE, SF_CACHE_TEXT, SF_LISTENED, SF_CONTEXT, SF_HANDLERS } from "../dom.symbols.js"
import { AnyDOM } from "../dom.types.js"

type Applier<T> = (root: HTMLElement, context: T) => void

export function apply<V>(node: AnyDOM<V>, delegator: EventDelegator, pool: Pool): Applier<V> {
  const instructions = compile(node)

  const payload = (id: number) => `p${id}`
  const payloads: any[] = [markup_template(node)]

  let code = `return function(root, context) {\n`
  let labels = 0

  code += `${payload(0)}(root);`
  code += `let sf_node_cache = root.${SF_CACHE};`
  code += `let sf_text_cache = root.${SF_CACHE_TEXT};`

  for (let id = 0; id < instructions.length; id++) {
    const instruction = instructions[id]
    const index = instruction.id

    if (instruction.text !== undefined) {
      const pIndex = payloads.length

      payloads.push(instruction.text)

      code += `iter_${labels++}: {`
      code += `const textnode = sf_text_cache[${index}];`
      code += `textnode.data = ${payload(pIndex)}(context);`
      code += `}`
    }

    if (instruction.events !== undefined) {
      code += `iter_${labels++}: {`
      code += `const element = sf_node_cache[${index}];`
      code += `if (!element.${SF_LISTENED}) {`
      code += `element.${SF_LISTENED} = true;`
      code += `element.${SF_CONTEXT} = context;`

      const pIndexRoot = payloads.length

      payloads.push(delegator)

      for (const key in instruction.events) {
        const pIndex = payloads.length

        payloads.push((instruction.events as any)[key] as any)

        code += `${payload(pIndexRoot)}.add(element, "${key}", ${payload(pIndex)});`
      }

      code += `}`
      code += `else {`
      code += `element.${SF_CONTEXT} = context;`
      code += '}'
      code += '}'
    }

    if (instruction.properties !== undefined) {
      code += `iter_${labels++}: {`
      code += `const element = sf_node_cache[${index}];`

      for (const key in instruction.properties) {
        const pIndex = payloads.length

        payloads.push((instruction.properties as any)[key])

        code += `element.${key} = ${payload(pIndex)}(context);`
      }

      code += '}'
    }

    if (instruction.conditional !== undefined) {
      const pIndex = payloads.length

      payloads.push(instruction.conditional)

      code += `iter_${labels++}: {`
      code += `const element = sf_node_cache[${index}];`
      code += `const condition = ${payload(pIndex)}(context);`
      code += `element.style.display = condition ? String() : 'none'`
      code += '}'
    }

    if (instruction.iterate !== undefined) {
      const node = instruction.iterate.each()
      const template = transform(node)

      const pIndex = payloads.length

      payloads.push({
        node,
        elements: [],
        template,
        applier: undefined,
        select: instruction.iterate.select,
        generator: apply,
        delegator,
        pool
      })

      code += `iter_${labels++}: {`
      code += `if (${payload(pIndex)}.applier === undefined) {`
      code += `${payload(pIndex)}.applier = ${payload(pIndex)}.generator(${payload(pIndex)}.node, ${payload(pIndex)}.delegator, ${payload(pIndex)}.pool);`
      code += `${payload(pIndex)}.applier(${payload(pIndex)}.template);`
      code += '}'
      code += `const items = ${payload(pIndex)}.select(context);`
      code += `const target = root.${SF_CACHE}[${index}];`
      code += `const { replaces, clears, addes, swaps, removes, updates } = items.flush();`
      code += `if (replaces) {`
      code += `const items_count = items.size;`
      code += `const child_count = ${payload(pIndex)}.elements.length;`
      code += `const common_count = Math.min(items_count, child_count);`

      code += `for (let index = 0; index < common_count; index++) {`
      code += `${payload(pIndex)}.applier(${payload(pIndex)}.elements[index], items.at(index));`
      code += `}`

      code += `if (items_count < child_count) {`
      code += `for (let index = items_count; index < child_count; index++) {`
      code += `const element = ${payload(pIndex)}.elements[index];`
      code += `${payload(pIndex)}.pool.add(element);`
      code += `element.remove();`
      code += `}`
      code += `${payload(pIndex)}.elements.length = items_count;`
      code += `} else if (child_count < items_count) {`
      code += `const fragment = document.createDocumentFragment();`
      code += `const elements = new Array(items_count - child_count);`
      code += `for (let index = child_count; index < items_count; index++) {`
      code += `const element = ${payload(pIndex)}.pool.get() || ${payload(pIndex)}.template.cloneNode(true);`
      code += `element.${SF_HANDLERS} = ${payload(pIndex)}.template.${SF_HANDLERS};`
      code += `element.${SF_CONTEXT} = items.at(index);`
      code += `${payload(pIndex)}.applier(element, items.at(index));`
      code += `elements[index - child_count] = element;`
      code += `fragment.appendChild(element);`
      code += `}`

      code += `${payload(pIndex)}.elements = ${payload(pIndex)}.elements.concat(elements);`
      code += `target.appendChild(fragment);`
      code += `}`
      code += `break iter_${labels - 1};`
      code += `}`

      code += `if (clears) {`
      code += `const free = ${payload(pIndex)}.elements.splice(0);`
      code += `for (const element of free) {`
      code += `element.${SF_HANDLERS} = undefined;`
      code += `${payload(pIndex)}.pool.add(element);`
      code += `}`
      code += `target.innerHTML = String();`
      code += `}`

      code += `if (addes > 0) {`
      code += `const fragment = document.createDocumentFragment();`
      code += `const elements = new Array(addes);`
      code += `for (let index = 0; index < addes; index++) {`
      code += `const element = ${payload(pIndex)}.pool.get() || ${payload(pIndex)}.template.cloneNode(true);`
      code += `element.${SF_HANDLERS} = ${payload(pIndex)}.template.${SF_HANDLERS};`
      code += `element.${SF_CONTEXT} = items.at(index);`
      code += `${payload(pIndex)}.applier(element, items.at(index));`
      code += `elements[index] = element;`
      code += `fragment.appendChild(element);`
      code += `}`
      code += `${payload(pIndex)}.elements = ${payload(pIndex)}.elements.concat(elements);`
      code += `target.appendChild(fragment);`
      code += `}`

      code += `for (const [i, j] of swaps.entries()) {`
      code += `${payload(pIndex)}.applier(${payload(pIndex)}.elements[i], items.at(i));`
      code += `${payload(pIndex)}.applier(${payload(pIndex)}.elements[j], items.at(j));`
      code += `}`

      code += `for (const id of removes) {`
      code += `const element = ${payload(pIndex)}.elements[id];`
      code += `element.${SF_HANDLERS} = undefined;`
      code += `${payload(pIndex)}.pool.add(element);`
      code += `element.remove();`
      code += `}`

      code += `for (const id of updates) {`
      code += `${payload(pIndex)}.applier(${payload(pIndex)}.elements[id], items.at(id));`
      code += `}`
      code += `}`
    }
  }

  code += '}'

  const generator = new Function(...payloads.map((_, id) => payload(id)), code)

  return generator(...payloads)
}