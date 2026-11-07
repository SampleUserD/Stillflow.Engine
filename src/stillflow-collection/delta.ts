export type Delta = {
  addes: number,
  swaps: Map<number, number>,
  updates: Set<number>,
  removes: Set<number>,
  replaces: boolean,
  clears: boolean
}

export function clear_delta(delta: Delta): void {
  delta.addes = 0
  delta.swaps.clear()
  delta.updates.clear()
  delta.removes.clear()
  delta.replaces = false
  delta.clears = false
}

export function copy_delta(delta: Delta): Delta {
  return {
    addes: delta.addes,
    swaps: new Map(delta.swaps),
    updates: new Set(delta.updates),
    removes: new Set(delta.removes),
    replaces: delta.replaces,
    clears: delta.clears
  }
}