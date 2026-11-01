import { Stillflow, State, operators, Collection } from "../index.js"
import { dom } from "../stillflow-adapters/index.js"

const state = new State()
const stillflow = new Stillflow<{ x: number }>(state)
const collection = new Collection<{ id: number, label: string }>([], 10000)

const list = dom.collection<{ id: number, label: string }, { todos: Collection<{ id: number, label: string }> }>({
  root: dom.div({}),
  select: context => context.todos,
  each() {
    return dom.div({
      children: [
        dom.span({
          children: [dom.text(context => `${context.id}. `)]
        }),
        dom.span({
          children: [dom.text(context => context.label)]
        })
      ]
    })
  },
})

const element = list.create()

document.body.appendChild(element)

for (let i = 0; i < 1000; i++) {
  collection.add({ id: i, label: `${i}-todo` })
}

collection.remove(0)
collection.remove(13)
collection.set(3, { id: 2, label: '1' })

collection.clear()

list.update({ todos: collection }, element)

for (let i = 0; i < 1000; i++) {
  collection.add({ id: i, label: `${i}-todo` })
}

list.update({ todos: collection }, element)