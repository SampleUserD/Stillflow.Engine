import { types } from "@babel/core"

export type PayloadResolver<V> = (value: V) => types.Node

export type PayloadTag<V> = {
  index: number,
  payload: string,
  resolver: PayloadResolver<V>
}

export class Payload {
  public static RESOLVE_STRING: PayloadResolver<string> = value => types.stringLiteral(value)
  public static RESOLVE_NUMBERIC: PayloadResolver<number> = value => types.numericLiteral(value)
  public static RESOLVE_BOOLEAN: PayloadResolver<boolean> = value => types.booleanLiteral(value)
  public static RESOLVE_NODE: PayloadResolver<types.Node> = value => value

  private _map = new Map<number, any>()
  private _indices = new Map<any, PayloadTag<any>>()
  private _index = 0

  private payload(index: number): string {
    return `p${index}`
  }

  public add<V>(value: V, resolver: PayloadResolver<V>): PayloadTag<V> {
    let payload_tag = this._indices.get(value)

    if (value === undefined) {
      throw new Error()
    }

    if (payload_tag === undefined) {
      payload_tag = {
        resolver,
        payload: this.payload(this._index),
        index: this._index++,
      }

      this._map.set(payload_tag.index, value)
      this._indices.set(value, payload_tag)
    }

    return payload_tag
  }

  public tag<V>(value: V): PayloadTag<V> {
    return this._indices.get(value)!
  }

  public get<V>(index: number): V {
    return this._map.get(index)! as V
  }

  public resolve<V>(value: V): types.Node {
    const payload_tag = this._indices.get(value)

    if (payload_tag === undefined) {
      throw new Error(`You should "add()" value first`)
    }

    return payload_tag.resolver(value)
  }

  public get parameters() {
    return Array.from(this._indices.values()).map(value => value.payload)
  }

  public get values() {
    return Array.from(this._indices.keys())
  }
}