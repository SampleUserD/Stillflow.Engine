import { Stillflow, State, collection, operators, adapters } from '../index.js'

type AppState = {
  input: string
}

type TodoItem = {
  label: string
}

type TodoState = {
  input: string,
  items: collection.Flushable<TodoItem>
}

const { jsxdom, dom } = adapters

const state = new State()
const stillflow = new Stillflow<AppState>(state)
const factory = stillflow.factory()

factory.add(collection.Flushable.name, () => new collection.Flushable(new collection.Fenwick(100)))

const source = {
  input: stillflow.variable('input').backref(),
  items: operators.is(collection.Flushable.name)
}

const view = stillflow.compile(source)
const instance: TodoState = stillflow.instantiate(view, factory)

function change(event: any) {
  instance.input = event.target.value
  stillflow.commit()
}

function add() {
  instance.items.add({ label: instance.input })
  instance.input = String()
  stillflow.commit()
}

function TodoItem() {
  return (
    <jsxdom.div>
      {(context: TodoItem) => context.label}
    </jsxdom.div>
  )
}

function App() {
  return (
    <jsxdom.div>
      <jsxdom.input sf: value={(context: TodoState) => context.input} on: change={change} />
      <jsxdom.button on: click={add}>
        Add
      </jsxdom.button>
      <jsxdom.div sf: for={(context: TodoState) => context.items} sf: each={() => <TodoItem />} />
    </jsxdom.div>
  )
}

const { element: app, update } = dom.$(<App />)

stillflow.on(() => update(instance))

instance.input = String()
stillflow.commit()

document.body.appendChild(app)