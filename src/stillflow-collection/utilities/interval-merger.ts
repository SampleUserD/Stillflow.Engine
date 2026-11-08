export class IntervalMerger {
  private _ranges: [number, number][] = []

  public add(left: number, right: number): void {
    if (left > right) {
      return
    }

    if (this._ranges.length <= 0) {
      this._ranges.push([left, right])
      return
    }

    const intervals: [number, number][] = []

    let new_interval: [number, number] = [left, right]
    let inserted = false

    for (const range of this._ranges) {
      if (range[1] < new_interval[0] - 1) {
        intervals.push(range)
      } else if (range[0] > new_interval[1] + 1) {
        if (inserted === false) {
          intervals.push(new_interval)
          inserted = true
        }

        intervals.push(range)
      } else {
        new_interval[0] = Math.min(new_interval[0], range[0])
        new_interval[1] = Math.max(new_interval[1], range[1])
      }
    }

    if (inserted === false) {
      intervals.push(new_interval)
    }

    this._ranges = intervals
  }

  public find_overlaps(left: number, right: number): [number, number][] {
    const overlaps: [number, number][] = []

    if (this._ranges.length <= 0) {
      return overlaps
    }

    let low = 0
    let high = this._ranges.length - 1

    let start_index = this._ranges.length

    while (low <= high) {
      const middle = (low + high) >> 1

      if (this._ranges[middle][1] >= left) {
        start_index = middle
        high = middle - 1
      } else {
        low = middle + 1
      }
    }

    for (let index = start_index; index < this._ranges.length; index++) {
      const [ol, or] = this._ranges[index]

      if (ol > right) {
        break
      }

      if (or >= left && ol <= right) {
        overlaps.push([ol, or])
      }
    }

    return overlaps
  }

  public clear(): void {
    this._ranges.length = 0
  }

  public get ranges() {
    return this._ranges
  }
}