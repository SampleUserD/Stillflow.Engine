import type { StillflowNode } from "@/stillflow-vite/vm-semantics"
import { pack_opcode } from "@/stillflow-vite/vm-abstract"
import { ChunkId, SlotId, as_chunk, as_slot } from "@/stillflow-vite/vm-semantics/vm.cursor"

export interface BytecodeChunk {
  id: ChunkId
  ref: SlotId
  code: number[]
}

export class BytecodeBuilder {
  private _code: number[] = []
  private _chunks: BytecodeChunk[] = []
  private _counter: SlotId = as_slot(0)
  private _map: Map<StillflowNode, SlotId> = new Map()

  public register(node: StillflowNode, id: SlotId = this.allocate_slot()): SlotId {
    this._map.set(node, id)

    return id
  }

  public slot_of(node: StillflowNode): SlotId {
    return this._map.get(node)!
  }

  public inherit_chunks(builder: BytecodeBuilder): void {
    this._chunks = this._chunks.concat(builder._chunks)
  }

  public child(): BytecodeBuilder {
    const builder = new BytecodeBuilder()

    builder._chunks = this._chunks
    builder._map = this._map

    return builder
  }

  public cut(site: () => void): number[] {
    const previous_size = this._code.length

    site()

    const current_size = this._code.length

    return this._code.splice(previous_size, current_size - previous_size)
  }

  public allocate_slot(): SlotId {
    return as_slot(this._counter++)
  }

  public embed_code(...code: number[]): void {
    this._code = this._code.concat(code)
  }

  public emit_code(target: number, opcode: number, ...code: number[]): void {
    this.embed_code(2 + code.length, pack_opcode(target, opcode), ...code)
  }

  public emit_chunk(code: number[]): number {
    const id = this.free_chunk_id
    const ref = this.last_slot_id

    return this._chunks.push({ id, ref, code }) - 1
  }

  public build(): { code: Uint16Array, chunks: BytecodeChunk[] } {
    return {
      code: new Uint16Array(this._code),
      chunks: this._chunks
    }
  }

  public get free_chunk_id(): ChunkId {
    return as_chunk(this._chunks.length)
  }

  public get last_slot_id(): SlotId {
    return this._counter
  }
}