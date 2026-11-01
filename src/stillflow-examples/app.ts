import { Stillflow, State, operators } from "../index.js"

const state = new State()
const stillflow = new Stillflow<{ x: number }>(state)
const factory = stillflow.factory()

factory.add('parent', view => {
  return {
    child: view
  }
})

const source = {
  x: operators.is('parent')
}

const linked_source = {
  link: operators.link(source)
}

const data = stillflow.compile(source)
const behaviour = stillflow.instantiate(data, factory)

console.log(behaviour)