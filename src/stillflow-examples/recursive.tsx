import { collections, runtime } from "stillflow.engine"

const { jsxdom, $ } = runtime

type ItemData = {
  text: string,
  items: collections.Flushable<ItemData>
}

function Item() {
  return (
    <jsxdom.div>
      <jsxdom.div>{(context: ItemData) => context.text}</jsxdom.div>
      <jsxdom.div sf: for={(context: ItemData) => context.items} sf: each={() => <Item />}></jsxdom.div>
    </jsxdom.div>
  )
}

const root_item: ItemData = {
  text: "Hello 1!",
  items: new collections.Flushable(new collections.Fenwick(64))
}

root_item.items.add({
  text: "Hello 2!",
  items: new collections.Flushable(new collections.Fenwick(64))
})

root_item.items.at(0).items.add({
  text: "Hello 3!",
  items: new collections.Flushable(new collections.Fenwick(64))
})

const Fabric = $(<Item />)

const { app, root } = Fabric()

document.body.appendChild(root)

app(root, root_item)