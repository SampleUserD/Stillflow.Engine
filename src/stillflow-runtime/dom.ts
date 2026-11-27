export type EntryPoint<V> = (root: HTMLElement, context: V) => (context: V) => void

export function $<V>(_: any): EntryPoint<V> {
  return () => () => { }
}

export const $parent: Element = {} as Element

export const $it: any = {}

export const $index: number = 0