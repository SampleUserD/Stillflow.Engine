import { Binding } from "../binding.js"
import { HTML_TAGS } from "./tags.js"

type Properties<V, K extends keyof HTMLElementTagNameMap> = {
  props?: Partial<Omit<HTMLElementTagNameMap[K], 'style'> & { style: Partial<HTMLElementTagNameMap[K]['style']> }>,
  events?: Partial<{ [K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void }>,
  children?: Binding<any, V>[]
}

function create<V, K extends keyof HTMLElementTagNameMap>(name: K, properties?: Properties<V, K>, updater?: (root: HTMLElementTagNameMap[K], context: V) => void): Binding<HTMLElementTagNameMap[K], V> {
  let { events, children, props } = properties || Object.create(null)

  props = props || Object.create(null)
  events = events || Object.create(null)
  children = children || Object.create(null)

  const style = props.style || Object.create(null)

  const element = document.createElement(name)

  const create = (context: V) => {
    for (const property in props) {
      element[property] = props[property]
    }

    for (const property in style) {
      element.style[property] = style[property]
    }

    for (const event in events) {
      element.addEventListener(event, events[event])
    }

    for (const child of children) {
      element.appendChild(child.create(context))
    }

    return element
  }

  const update = (context: V) => {
    updater?.(element, context)

    for (const child of children) {
      child.update(context)
    }
  }

  const destroy = () => {
    element.remove()

    for (const event in events) {
      element.removeEventListener(event, events[event])
    }

    for (const child of children) {
      child.destroy()
    }
  }

  return {
    create,
    update,
    destroy
  }
}

function text<V>(getter: (view: V) => string): Binding<Text, V> {
  const text = document.createTextNode(String())

  const update = (context: V) => {
    text.nodeValue = getter(context)
  }

  const create = (context: V) => {
    update(context)
    return text
  }

  const destroy = () => {
    text.remove()
  }

  return {
    create,
    update,
    destroy
  }
}

function lens<T, W, V>(binding: Binding<T, W>, lens: (context: V) => W) {
  const update = (context: V) => {
    binding.update(lens(context))
  }

  const create = (context: V) => {
    return binding.create(lens(context))
  }

  const destroy = () => {
    binding.destroy()
  }

  return {
    create,
    update,
    destroy
  }
}

const dom: { [K in keyof HTMLElementTagNameMap]: <V>(properties: Properties<V, K>, update?: (root: HTMLElementTagNameMap[K], context: V) => void) => Binding<HTMLElementTagNameMap[K], V> } & { text: typeof text, lens: typeof lens } = Object.create(null)

for (const tag of HTML_TAGS) {
  (dom as any)[tag] = <V>(
    properties: Properties<V, typeof tag>,
    update?: (root: HTMLElementTagNameMap[typeof tag], context: V) => void
  ) => create(tag, properties, update)
}

dom['text'] = text
dom['lens'] = lens

export { dom }