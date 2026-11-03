import { Stillflow, State, Collection, operators } from '../index.js'
import { buildData } from './data.js'
import { dom } from '../stillflow-adapters/index.js'

const stillflow = new Stillflow(new State())
const factory = stillflow.factory()

factory.add(Collection.name, view => new Collection(view.data, 10000))

const todos = stillflow.variable('todos')
const selected_id = stillflow.variable('selected_id')
const previous_id = stillflow.variable('previous_id')

const state = stillflow.compile({
  previous_id: previous_id.backref(),
  id: selected_id.backref(),
  data: todos.backref(),
  todos: operators.is(Collection.name)
})

state.data = []

stillflow.commit()

const instance = stillflow.instantiate(state, factory)

function add(count = 1000) {
  const rows = buildData(count)

  for (const row of rows) {
    instance.todos.add(row)
  }
}

function run() {
  instance.todos.clear()
  instance.id = undefined
  add(1000)
}

function remove(id: number) {
  instance.todos.remove(instance.todos.index(id))
}

function select(id: number) {
  instance.id = id
  instance.todos.mutate(id, () => { })
}

function clear() {
  instance.todos.clear()
}

function update() {
  const length = instance.todos.size()
  const mutator = (view: { id: number, index: number, label: string }) => view.label += ' !!!'

  for (let i = 0; i < length; i += 10) {
    instance.todos.mutate(instance.todos.index(i), mutator)
  }
}

function run_lots() {
  instance.todos.clear()
  instance.id = undefined
  add(10000)
}

function swap_rows() {
  const size = instance.todos.total_size

  if (size > 998) {
    instance.todos.swap(1, 998)
    instance.todos.mutate(1, (item: { id: number, index: number, label: string }) => item.index = 998)
    instance.todos.mutate(998, (item: { id: number, index: number, label: string }) => item.index = 1)
  }
}

const description = dom.div<typeof instance>({}, [
  dom.div({}, [
    dom.h1({ text: 'Stillflow' }, []),
    dom.div({}, [
      dom.div({}, [
        dom.button({
          text: 'Replace 1,000 rows',
          events: {
            click: () => run()
          }
        })
      ]),
      dom.div({}, [
        dom.button({
          text: 'Replace 10,000 rows',
          events: {
            click: () => run_lots()
          }
        })
      ]),
      dom.div({}, [
        dom.button({
          text: 'Append 1,000 rows',
          events: {
            click: () => add()
          }
        })
      ]),
      dom.div({}, [
        dom.button({
          text: 'Update every 10th row',
          events: {
            click: () => update()
          }
        })
      ]),
      dom.div({}, [
        dom.button({
          text: 'Swap rows',
          events: {
            click: () => swap_rows()
          }
        })
      ]),
      dom.div({}, [
        dom.button({
          text: 'Clear',
          events: {
            click: () => clear()
          }
        })
      ])
    ])
  ]),
  dom.table({
    modifiers: {
      iterate: {
        select: context => context.todos,
        each() {
          return dom.div<{ id: number, index: number, label: string }>({}, [
            dom.span({
              modifiers: {
                text: context => String(context.id)
              }
            }),
            dom.span({
              modifiers: {
                text: context => String(context.label)
              }
            }),
            dom.button({
              text: 'X',
              modifiers: {
                events: {
                  click: (event, context) => remove(context.index)
                }
              }
            })
          ])
        }
      }
    }
  })
])

const element = dom.transform(description)

document.body.appendChild(element)

const applier = dom.apply(instance, dom.compile(description))

stillflow.on(() => applier(element, instance))

requestAnimationFrame(function update() {
  stillflow.commit()

  requestAnimationFrame(update)
})