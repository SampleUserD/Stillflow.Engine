import { runtime, collections } from "stillflow.engine"

const { dom, $ } = runtime

const sf = { for: (props: { each: collections.Flushable<number> }) => { } }

const collection = new collections.Flushable<number>(new collections.Fenwick(16))
const collection_0 = new collections.Flushable<number>(new collections.Fenwick(16))
const collection_1 = new collections.Flushable<number>(new collections.Fenwick(16))

collection.add(1)
collection.add(2)
collection.add(3)
collection.add(4)

collection_0.add(1)
collection_0.add(2)
collection_0.add(3)

collection_1.add(1)
collection_1.add(2)

function Item() {
  return (
    <dom.div>
      <for each={collection}>
        <dom.div>
          <dom.div>
            <for each={collection_0}>
              <dom.div>Hello!</dom.div>
            </for>
          </dom.div>
        </dom.div>
      </for>
    </dom.div>
  )
}

const { app, root } = $(
  <dom.div>
    <Item />
  </dom.div>
)

document.body.appendChild(root)

console.log(root)

app({})