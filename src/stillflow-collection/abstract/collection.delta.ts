import { LogicalIndex, PhysicalIndex } from "@/stillflow-collection/abstract/collection.index"

export type Delta<T> = {
  addes: number,
  swaps: Map<LogicalIndex, LogicalIndex>,
  updates: Map<LogicalIndex, T>,
  removes: Set<LogicalIndex>,
  replaces: boolean,
  clears: boolean
}

export function clear_delta<T>(delta: Delta<T>): void {
  delta.addes = 0
  delta.swaps.clear()
  delta.updates.clear()
  delta.removes.clear()
  delta.replaces = false
  delta.clears = false
}