import { pack_opcode } from "@/stillflow-vite/vm-abstract"
import { Opcode } from "@/stillflow-vite/vm-compiler/codes"
import { ChunkId, InternId, SlotId, as_chunk, as_intern, as_slot } from "@/stillflow-vite/vm-compiler/nodes"

export interface BytecodeChunk {
  readonly id: ChunkId
  readonly mount: number[]
  readonly patch: number[]
  readonly captures: readonly string[]

  root_slot?: SlotId
}

export class Interner<T> {
  private _pool = new Map<T, InternId>()

  private readonly _table: T[] = []

  public intern(value: T): InternId {
    let id = this._pool.get(value)

    if (id === undefined) {
      id = as_intern(this._table.length)

      this._table.push(value)
      this._pool.set(value, id)
    }

    return id
  }

  public get(id: InternId): T {
    return this._table[id]
  }
}

export class BytecodeBuilder {
  public readonly chunks: BytecodeChunk[] = []
  public readonly interner = new Interner<string>()
  public readonly component_chunks = new Map<string, ChunkId>()
  public readonly is_controller_slot: boolean[] = []

  public root_chunk_id: ChunkId = as_chunk(0)

  private _active!: BytecodeChunk
  private _slots: number = 0

  public allocate_slot(): SlotId {
    return as_slot(this._slots++)
  }

  public allocate_chunk(): ChunkId {
    const id = as_chunk(this.chunks.length)

    this.chunks.push({ id, mount: [], patch: [], captures: [] }) - 1

    return id
  }

  public allocate_controller_slot(): SlotId {
    const id = this.allocate_slot()

    this.is_controller_slot[id] = true

    return id
  }

  public intern(value: string): InternId {
    return this.interner.intern(value)
  }

  public emit_mount(opcode: Opcode, ...ops: number[]): void {
    this._active.mount.push(opcode, ...ops)
  }

  public emit_patch(opcode: Opcode, ...ops: number[]): void {
    this._active.patch.push(opcode, ...ops)
  }

  public with_chunk(captures: readonly string[], site: () => void): BytecodeChunk {
    const chunk: BytecodeChunk = {
      id: as_chunk(this.chunks.length),
      mount: [],
      patch: [],
      captures
    }

    const previous = this._active

    this.chunks.push(chunk)

    this._active = chunk
    site()
    this._active = previous

    return chunk
  }

  public fill_chunk(id: ChunkId, captures: readonly string[], site: () => SlotId | undefined): BytecodeChunk {
    const chunk = this.chunks[id]

    if (chunk === undefined) {
      throw new Error(`Chunk #${id} was not allocated`);
    }

    Object.assign(chunk, { captures })

    const previous = this._active

    this._active = chunk
    chunk.root_slot = site()
    this._active = previous

    return chunk
  }

  public compile_subtree(captures: readonly string[], emit_root: () => SlotId | undefined): BytecodeChunk {
    const chunk: BytecodeChunk = {
      id: as_chunk(this.chunks.length),
      mount: [],
      patch: [],
      captures,
    }

    const previous = this._active

    this.chunks.push(chunk)

    this._active = chunk
    chunk.root_slot = emit_root()
    this._active = previous

    return chunk
  }
}