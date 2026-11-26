type Brand<T, K extends string> = T & { readonly __brand: K }

export type SlotId = Brand<number, 'SlotId'>
export type ChunkId = Brand<number, 'ChunkId'>
export type InternId = Brand<number, 'InternId'>

export const as_slot = (n: number) => n as SlotId
export const as_chunk = (n: number) => n as ChunkId
export const as_intern = (n: number) => n as InternId

export interface ScopeMeta {
  captures: Set<string>
}

export interface AnalysisMeta {
  has_child_chunks: boolean
  is_dynamic: boolean
  slot?: SlotId
}

export interface BaseNodeMeta {
  scope: ScopeMeta
  analysis: AnalysisMeta
}

export interface BaseStillflowNode<K extends string> {
  readonly kind: K
  readonly meta: BaseNodeMeta
}

export const create_empty_meta = (): BaseNodeMeta => {
  return {
    scope: {
      captures: new Set()
    },
    analysis: {
      is_dynamic: false,
      has_child_chunks: false
    }
  }
}

export interface ExpressionNode extends BaseStillflowNode<'Expression'> {
  readonly code: string
  readonly refs: readonly string[]
}

export interface ElementNode extends BaseStillflowNode<'Element'> {
  readonly tag: string
  readonly static_properties: Record<string, string>
  readonly dynamic_properties: Record<string, ExpressionNode>
  readonly children: StillflowNode[]
}

export interface TextNode extends BaseStillflowNode<'Text'> {
  readonly value: string | ExpressionNode
  readonly is_dynamic: boolean
}

export interface ForNode extends BaseStillflowNode<'For'> {
  readonly select: ExpressionNode
  readonly item_name: string
  readonly index_name: string
  readonly body: StillflowNode[]
}

export interface CallNode extends BaseStillflowNode<'Call'> {
  readonly component_name: string

  readonly properties: Record<string, ExpressionNode>
}

export type StillflowNode =
  | ExpressionNode
  | ElementNode
  | TextNode
  | ForNode
  | CallNode