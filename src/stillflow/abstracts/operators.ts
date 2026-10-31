type Mapping = Record<string, any>

export type Ref<T extends Mapping, P extends keyof T> = {
  type: 'ref',
  path: P
}

export type Backref<T extends Mapping, P extends keyof T> = {
  type: 'backref',
  path: P
}

export type Local<T> = {
  type: 'local',
  value: T
}

export type Link<V extends Mapping> = {
  type: 'link',
  source: V
}

export type Is = {
  type: 'is'
  factory: string
}