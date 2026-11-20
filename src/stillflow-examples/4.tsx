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

const { dom, $ } = runtime

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
    <dom.div>
      {(context: TodoItem) => context.label}
    </dom.div>
  )
}

function App() {
  return (
    <dom.div>
      <dom.input sf: value={(context: TodoState) => context.input} on: change={change} />
      <dom.button on: click={add}>
        Add
      </dom.button>
      <dom.div sf: for={(context: TodoState) => context.items} sf: each={() => <TodoItem />} />
    </dom.div>
  )
}

const Fabric = $(<App />)

const { app: update, root } = Fabric

stillflow.on(() => update(root, instance))

document.body.appendChild(root)

instance.input = String()
stillflow.commit()