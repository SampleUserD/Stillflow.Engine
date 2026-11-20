declare const __brand: unique symbol

type Brand<T, B> = T & { readonly [__brand]: B }

export type Index = number
export type LogicalIndex = Brand<Index, 'LogicalIndex'>
export type PhysicalIndex = Brand<Index, 'PhysicalIndex'>

export const as_logical = (id: number) => id as LogicalIndex
export const as_physical = (id: number) => id as PhysicalIndex