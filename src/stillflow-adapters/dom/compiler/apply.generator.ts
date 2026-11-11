import { Pool } from "./pool.js"
import { Compiler, Template } from "./compile.js"
import { transform } from "./transform.js"

const SF_LISTENED = '__stillflow_listened__'
const SF_CONTEXT = '__stillflow_context__'
const SF_CACHE_TEXT = '__stillflow_cache_text__'
const SF_CACHE = '__stillflow_cache__'

type Applier<T> = (root: HTMLElement, context: T) => void

function find_element_by(root: HTMLElement, path: number[]): HTMLElement {
  let current = root

  for (let id = 0; id < path.length; id++) {
    current = current.children[path[id]] as HTMLElement
  }

  return current
}

function markup(root: HTMLElement, paths: number[][]): HTMLElement[] {
  const node = root as any

  if (node[SF_CACHE]) {
    return node[SF_CACHE]
  }

  const cache = new Array<HTMLElement>(paths.length)
  const text_cache = new Array<Text>(paths.length)

  for (let id = 0; id < paths.length; id++) {
    cache[id] = find_element_by(root, paths[id])
    text_cache[id] = cache[id].firstChild as Text
  }

  node[SF_CACHE] = cache
  node[SF_CACHE_TEXT] = text_cache

  return cache
}

export function generate_applier<V>(template: Template<V>, pool: Pool): Applier<V> {
  const { instructions, paths } = template

  const payload = (id: number) => `p${id}`
  const payloads: any[] = [markup, paths]

  let code = `return function(root, context) {\n`

  code += `${payload(0)}(root, ${payload(1)});`

  for (let id = 0; id < instructions.length; id++) {
    const instruction = instructions[id]
    const index = instruction.id

    if (instruction.text !== undefined) {
      const pIndex = payloads.length

      payloads.push(instruction.text)

      code += `(function() {`
      code += `const textnode = root.${SF_CACHE_TEXT}[${index}];`
      code += `if (textnode !== null) textnode.nodeValue = ${payload(pIndex)}(context);`
      code += `})();`
    }

    if (instruction.events !== undefined) {
      code += `(function() {`
      code += `const element = root.${SF_CACHE}[${index}];`
      code += `if (!element.${SF_LISTENED}) {`
      code += `element.${SF_LISTENED} = true;`
      code += `element.${SF_CONTEXT} = context;`

      const pIndexRoot = payloads.length

      payloads.push(pool.listeners)

      for (const key in instruction.events) {
        const pIndex = payloads.length

        payloads.push((instruction.events as any)[key] as any)

        code += `${payload(pIndexRoot)}.add(element, "${key}", ${payload(pIndex)});`
      }

      code += `}`
      code += `else {`
      code += `element.${SF_CONTEXT} = context;`
      code += '}'
      code += '})();'
    }

    if (instruction.properties !== undefined) {
      code += `(function() {`
      code += `const element = root.${SF_CACHE}[${index}];`
      code += `if (element !== undefined) {`

      for (const key in instruction.properties) {
        const pIndex = payloads.length

        payloads.push((instruction.properties as any)[key])

        code += `element.${key} = ${payload(pIndex)}(context);`
      }

      code += `}`
      code += '})();'
    }

    if (instruction.conditional !== undefined) {
      const pIndex = payloads.length

      payloads.push(instruction.text)

      code += `(function () {`
      code += `const element = root.${SF_CACHE}[${index}];`
      code += `const condition = ${payload(pIndex)}(context);`
      code += `element.style.display = condition ? String() : 'none'`
      code += '})();'
    }

    if (instruction.iterate !== undefined) {
      const node = instruction.iterate.each()

      const compiler = new Compiler<unknown>()

      const template = transform(node)

      const pIndex = payloads.length

      payloads.push({
        compilation: compiler.compile(node),
        elements: [],
        template,
        applier: undefined,
        select: instruction.iterate.select,
        generator: generate_applier,
        pool
      })

      code += `(function () {`
      code += `if (${payload(pIndex)}.applier === undefined) {`
      code += `${payload(pIndex)}.applier = ${payload(pIndex)}.generator(${payload(pIndex)}.compilation, ${payload(pIndex)}.pool)`
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
      code += `${payload(pIndex)}.applier(element, items.at(index));`
      code += `elements[index - child_count] = element;`
      code += `fragment.appendChild(element);`
      code += `}`

      code += `${payload(pIndex)}.elements = ${payload(pIndex)}.elements.concat(elements);`
      code += `target.appendChild(fragment);`
      code += `}`
      code += `return;`
      code += `}`

      code += `if (clears) {`
      code += `const free = ${payload(pIndex)}.elements.splice(0);`
      code += `for (const element of free) {`
      code += `${payload(pIndex)}.pool.add(element);`
      code += `}`
      code += `target.innerHTML = String();`
      code += `}`

      code += `if (addes > 0) {`
      code += `const fragment = document.createDocumentFragment();`
      code += `const elements = new Array(addes);`
      code += `for (let index = 0; index < addes; index++) {`
      code += `const element = ${payload(pIndex)}.template.cloneNode(true);`
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
      code += `${payload(pIndex)}.pool.add(element);`
      code += `element.remove();`
      code += `}`

      code += `for (const id of updates) {`
      code += `${payload(pIndex)}.applier(${payload(pIndex)}.elements[id], items.at(id));`
      code += `}`
      code += `})();`
    }
  }

  code += '}'

  const generator = new Function(...payloads.map((_, id) => payload(id)), code)

  return generator(...payloads)
}