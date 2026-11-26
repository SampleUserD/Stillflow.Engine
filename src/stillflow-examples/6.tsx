import { collections, runtime } from "stillflow.engine"

const { dom, $, $index, $it, $parent } = runtime

const { div, span } = dom

const collection = new collections.Flushable<number>(new collections.Fenwick(16))
const collection_0 = new collections.Flushable<number>(new collections.Fenwick(16))

collection.attach([1, 2, 3, 4])
collection_0.attach([1, 2, 3, 4])

const { app, root } = $(
  <div>
    <for select={collection}>
      <div>
        <div>{`${$index}: ${$it}`}!</div>
        <div>
          <for select={collection_0}>
            <div>{`${$index}: ${$it}, ${$parent.tagName}`}!</div>
          </for>
        </div>
      </div>
    </for>
  </div>
)({})

document.body.appendChild(root)

