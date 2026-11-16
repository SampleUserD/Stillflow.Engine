import { core, collections, operators, runtime } from '../index.ts'

type AppState = {
  input: string
}

type TodoItem = {
  label: string
}

type TodoState = {
  input: string,
  items: collections.Flushable<TodoItem>
}

const { jsxdom, $ } = runtime

const state = new core.State()
const stillflow = new core.Stillflow<AppState>(state)
const factory = stillflow.factory()

factory.add(collections.Flushable.name, () => new collections.Flushable(new collections.Fenwick(100)))

const source = {
  input: stillflow.variable('input').backref(),
  items: operators.is(collections.Flushable.name)
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

const Fabric = $(<App />)

const { app: update, root } = Fabric()

stillflow.on(() => update(root, instance))

document.body.appendChild(root)

instance.input = String()
stillflow.commit()