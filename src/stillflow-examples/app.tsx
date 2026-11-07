import { adapters, Stillflow, State, Collection } from "../index.js"

const stillflow = new Stillflow(new State())
const { jsxdom } = adapters

const view = stillflow.compile({
  input: stillflow.variable('input').backref(),
})

type TodoItem = {
  id: number,
  label: string,
  loaded: boolean
}

function Todo() {
  return (
    <jsxdom.div sf-if={(context: TodoItem) => context.loaded}>
      <jsxdom.span>
        {(context: TodoItem) => context.id + 1}.
      </jsxdom.span>
      <jsxdom.span>
        {(context: TodoItem) => context.label}
      </jsxdom.span>
      <jsxdom.button type="button" sf-on-click={(event, context: TodoItem) => remove(context.id)}>
        X
      </jsxdom.button>
    </jsxdom.div>
  )
}

function TodoList<V>(properties: { select: (context: V) => Collection<TodoItem> }) {
  const { select } = properties

  return (
    <jsxdom.div>
      <jsxdom.input type="text" sf-value={() => view.input} onchange={event => change(event.currentTarget as HTMLInputElement)} />
      <jsxdom.button type="button" onclick={() => add()}>Add</jsxdom.button>
      <jsxdom.div sf-for={select} sf-each={() => <Todo />} />
    </jsxdom.div>
  )
}

const items = new Collection<TodoItem>([], 1000)

const { element, update } = jsxdom.$(<TodoList select={(context: { items: Collection<TodoItem> }) => context.items} />)

document.body.appendChild(element)

function remove(id: number) {
  items.remove(id)
  update({ items })
}

function add() {
  const id = items.total_size
  items.add({ id, label: view.input, loaded: false })
  view.input = String()
  stillflow.commit()

  if (id % 10 === 0) {
    items.mutate(id, view => view.loaded = true)
  }

  update({ items })
}

function change(input: HTMLInputElement) {
  view.input = input.value
  stillflow.commit()
}

update({ items })