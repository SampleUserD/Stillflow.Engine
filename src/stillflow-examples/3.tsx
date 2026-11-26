import { runtime, collections } from "stillflow.engine"

const { dom, $ } = runtime

type Item = {
  id: number,
  label: string
}

type Items = {
  items: collections.Flushable<Item>
}

function Items(props: { component: () => any }) {
  return <dom.div sf: for={(context: Items) => context.items} sf: each={props.component} />
}

const { app, root } = $<Items>(<Items component={() => <dom.div>{(context: Item) => context.label}</dom.div>} />)

document.body.appendChild(root)

const collection = new collections.Flushable<Item>(new collections.Fenwick(16))

collection.add({ id: 1, label: "Hello 1!" })
collection.add({ id: 2, label: "Hello 2!" })
collection.add({ id: 3, label: "Hello 3!" })

app({ items: collection })