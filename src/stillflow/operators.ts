import { Backref, Is, Link, Local, Ref } from "./abstracts/operators.js"

type Mapping = Record<string, any>

function ref<T extends Mapping, K extends keyof T>(path: K): Ref<T, K> {
  return {
    type: 'ref',
    path
  }
}

function backref<T extends Mapping, K extends keyof T>(path: K): Backref<T, K> {
  return {
    type: 'backref',
    path
  }
}

function local<T>(value: T): Local<T> {
  return {
    type: 'local',
    value
  }
}

function link<V extends Mapping>(source: V): Link<V> {
  return {
    type: 'link',
    source
  }
}

function is(factory: string): Is {
  return {
    type: 'is',
    factory
  }
}

export default { ref, backref, link, local, is }