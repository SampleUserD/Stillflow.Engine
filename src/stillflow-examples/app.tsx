import { adapters, Stillflow, State, Collection } from "../index.js"

const stillflow = new Stillflow(new State())
const { jsxdom } = adapters

type TodoItem = {
  id: number,
  label: string
}

function Todo() {
  return (
    <jsxdom.div>
      <jsxdom.span>
        {(context: TodoItem) => context.id + 1}.
      </jsxdom.span>
      <jsxdom.span>
        {(context: TodoItem) => context.label}
      </jsxdom.span>
      <jsxdom.button type="button" sf-onclick={(event, context: TodoItem) => remove(context.id)}>
        X
      </jsxdom.button>
    </jsxdom.div>
  )
}

function TodoList<V>(properties: { select: (context: V) => Collection<TodoItem> }) {
  const { select } = properties

  return (
    <jsxdom.div sf-for={select} sf-each={() => <Todo />} />
  )
}

const items = new Collection<TodoItem>([], 1000)

const { element, update } = jsxdom.$(<TodoList select={(context: { items: Collection<TodoItem> }) => context.items} />, { items })

document.body.appendChild(element)

for (let index = 0; index < 1000; index++) {
  items.add({ id: index, label: `Hello ${index}` })
}

function remove(id: number) {
  items.remove(id)
  update({ items })
}

update({ items })