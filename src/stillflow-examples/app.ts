import { Stillflow, State, operators } from "../index.js"

const state = new State()
const stillflow = new Stillflow<{ x: number }>(state)
const factory = stillflow.factory()

factory.add('test', () => {
  return { value: 10 }
})

const x = stillflow.variable('x')

const source = { y: operators.is('test') }

const view = stillflow.compile({
  x: x.ref(),
  link: operators.link(source)
})

const instance = stillflow.instantiate(view, factory)

console.log(view, instance)