type Brand<T, B> = T & { __brand: B }

export type ChunkId = Brand<number, 'chunk'>
export type SlotId = Brand<number, 'slot'>

export interface StillflowCursor {
  parent: SlotId
  chunk: ChunkId
}

export const as_chunk = (id: number) => id as ChunkId

export const as_slot = (id: number) => id as SlotId