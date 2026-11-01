import { Stillflow, State, operators } from "../index.js"

const state = new State()
const stillflow = new Stillflow<{ x: number, y: number }>(state)
const factory = stillflow.factory()

const x = stillflow.variable('x')
const y = stillflow.variable('y')

const source_0 = {
  y: y.ref(),
  z: operators.is('test')
}

const source_1 = {
  x: x.ref(),
  l: operators.link(source_0)
}

factory.add('test', () => {
  return {
    value: 10
  }
})

const view = stillflow.compile(source_1)

console.log(view.meta)

console.log(stillflow.instantiate(view, factory))