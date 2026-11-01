import { Stillflow, State, operators, Collection } from "../index.js"

const state = new State()
const stillflow = new Stillflow<{ x: number }>(state)

const collection = new Collection([1, 2, 3], 3)

collection.remove(1)
collection.remove(1)

console.log(collection.index(2))