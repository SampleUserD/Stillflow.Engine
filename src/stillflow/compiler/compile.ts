import { Backref, Is, Link, Local, Ref } from "../abstracts/operators.js"
import { Kernel } from "../kernel/kernel.js"
import { IR } from "../abstracts/IR.js"
import { Meta } from "../abstracts/meta.js"
import { View } from "../abstracts/view.js"

type Mapping = Record<string, any>
type Source = Record<string, Link<any> | Ref<any, any> | Backref<any, any> | Local<any> | Is>

function $CompileIR<V extends Source>(source: V): IR {
  const ir: IR = {
    refs: Object.create(null),
    links: Object.create(null),
    locals: Object.create(null),
    backrefs: Object.create(null),
    behaviors: Object.create(null)
  }

  for (const key in source) {
    const operator = source[key]

    switch (operator.type) {
      case 'is':
        ir.behaviors[key] = operator.factory
        break
      case 'ref':
        ir.refs[key] = operator.path
        break
      case 'link':
        ir.links[key] = operator.source
        break
      case 'local':
        ir.locals[key] = operator.value
        break
      case 'backref':
        ir.backrefs[key] = operator.path
        break
      default:
        throw new Error(`Undefined operator '${operator}'`)
    }
  }

  return ir
}

function $ProcessBackrefs<T extends Mapping>(kernel: Kernel<T>, source: IR, view: Mapping): void {
  for (const key in source.backrefs) {
    kernel.write(source.backrefs[key], view[key])
  }
}

function $ProcessLocals(source: IR, view: Mapping): void {
  for (const key in source.locals) {
    view[key] = source.locals[key]
  }
}

function $ProcessLinks<T extends Mapping>(kernel: Kernel<T>, source: IR, view: Mapping): void {
  for (const key in source.links) {
    view[key] = $Compile(kernel, source.links[key])
  }
}

function $ProcessRef<T extends Mapping>(kernel: Kernel<T>, source: IR, view: Mapping): void {
  for (const key in source.refs) {
    view[key] = kernel.read(source.refs[key])
  }
}

function $ProcessIs(source: IR, view: Meta): void {
  for (const key in source.behaviors) {
    view.meta.behaviors[key] = source.behaviors[key]
  }
}

function $Process<T extends Mapping>(kernel: Kernel<T>, source: IR, view: Meta): void {
  view.meta = {
    instantiated: false,
    behaviors: Object.create(null),
    source
  }

  $ProcessBackrefs(kernel, source, view)
  $ProcessLocals(source, view)
  $ProcessLinks(kernel, source, view)
  $ProcessRef(kernel, source, view)
  $ProcessIs(source, view)
}

export function $ProcessWrite<T extends Mapping>(kernel: Kernel<T>, source: IR, view: Mapping): void {
  $ProcessBackrefs(kernel, source, view)
}

export function $ProcessRead<T extends Mapping>(kernel: Kernel<T>, source: IR, view: Mapping) {
  $ProcessRef(kernel, source, view)
  $ProcessLinks(kernel, source, view)
}

export function $Compile<V extends Source, T extends Mapping>(kernel: Kernel<T>, source: V): View<V, T> & Meta {
  const view: View<V, T> & Meta = Object.create(null)
  const ir = $CompileIR(source)

  $Process(kernel, ir, view)

  return view
}