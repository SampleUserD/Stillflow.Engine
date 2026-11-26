import { CallNode, ElementNode, ExpressionNode, ForNode, StillflowNode, TextNode, create_empty_meta } from "@/stillflow-vite/vm-compiler/nodes"

export class Fabric {
  public static expression(code: string, refs: string[]): ExpressionNode {
    return {
      kind: 'Expression',
      code,
      refs,
      meta: create_empty_meta()
    }
  }

  public static element(tag: string, static_properties: Record<string, string>, dynamic_properties: Record<string, ExpressionNode>, children: StillflowNode[]): ElementNode {
    return {
      kind: 'Element',
      tag,
      static_properties,
      dynamic_properties,
      children,
      meta: create_empty_meta()
    }
  }

  public static text(value: string | ExpressionNode): TextNode {
    return {
      kind: 'Text',
      value,
      is_dynamic: typeof value !== 'string',
      meta: create_empty_meta()
    }
  }

  public static for(select: ExpressionNode, item_name: string, index_name: string, body: StillflowNode[]): ForNode {
    return {
      kind: 'For',
      select,
      index_name,
      item_name,
      body,
      meta: create_empty_meta()
    }
  }

  public static call(component_name: string, properties: Record<string, ExpressionNode>): CallNode {
    return {
      kind: 'Call',
      component_name,
      properties,
      meta: create_empty_meta()
    }
  }
}

