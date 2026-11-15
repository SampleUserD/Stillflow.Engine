import { adapters, collection } from "@/index"

const { jsxdom } = adapters

function Item() {
  return <jsxdom.div>{(context: { label: string }) => context.label}</jsxdom.div>
}

export const App = <jsxdom.div sf: for={(c: any) => c.items} sf: each={() => <jsxdom.div>{(context: { label: string }) => context.label}</jsxdom.div>} />

const { app, root } = App

window.onload = () => {
  const view = new collection.Fenwick<{ label: string }>(100)
  const flushable_view = new collection.Flushable(view)

  flushable_view.add({ label: "Hello 1" })
  flushable_view.add({ label: "Hello 2" })
  flushable_view.add({ label: "Hello 3" })

  document.body.appendChild(root())
  app(root(), { items: flushable_view })
}