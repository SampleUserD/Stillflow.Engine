import { collections, runtime } from "stillflow.engine"

const { dom, $ } = runtime

type ItemData = {
  text: string,
  items: collections.Flushable<ItemData>
}

function Item() {
  return (
    <dom.div>
      <dom.div>{(context: ItemData) => context.text}</dom.div>
      <dom.div sf: for={(context: ItemData) => context.items} sf: each={() => <Item />}></dom.div>
    </dom.div>
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

root_item.items.at(collections.as_logical(0)).items.add({
  text: "Hello 3!",
  items: new collections.Flushable(new collections.Fenwick(64))
})

const Fabric = $(<Item />)

const { app, root } = Fabric

document.body.appendChild(root)

app(root, root_item)