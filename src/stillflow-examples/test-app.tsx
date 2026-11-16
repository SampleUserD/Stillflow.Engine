import { collection } from "../index.ts"
import { runtime } from "../index.ts"
import { Item } from "./test-app-2.tsx"

const { $, jsxdom } = runtime

const Items = () => {
  return <jsxdom.div sf: for={(context: { items: collection.Flushable<number> }) => context.items} sf: each={() => <Item controller={() => alert(1)} />} />
}

const Fabric = $(<Items />)

const { app, root } = Fabric()

document.body.appendChild(root)

const col = new collection.Flushable<number>(new collection.Fenwick(100))

col.attach([1, 2, 3, 4])

app(root, { items: col })