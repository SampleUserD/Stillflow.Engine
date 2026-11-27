import { TransformResult } from "@/stillflow-vite/dom.pass.transform"
import { BytecodeBuilder } from "@/stillflow-vite/vm-compiler/bytecode-builder"
import { SymbolScope, analyze_dirty, analyze_tree, create_dirty_context, resolve_scopes } from "@/stillflow-vite/vm-compiler"
import { SlotId, StillflowNode, as_slot } from "@/stillflow-vite/vm-compiler/nodes"
import { Opcode } from "@/stillflow-vite/vm-compiler/codes"

export function lower_to_bytecode(transformed: TransformResult, scope: SymbolScope): BytecodeBuilder {
  const builder = new BytecodeBuilder()

  for (const name of transformed.components.keys()) {
    const id = builder.allocate_chunk()
    builder.component_chunks.set(name, id)
  }

  resolve_scopes(transformed.root, scope)
  analyze_tree(transformed.root)

  const root_dirty = create_dirty_context(['$it'])

  analyze_dirty(transformed.root, root_dirty)

  const root_chunk = builder.compile_subtree(root_dirty.tracked_variables, () => lower_node(transformed.root, builder, undefined))

  builder.root_chunk_id = root_chunk.id

  for (const [name, component] of transformed.components) {
    const component_chunk_id = builder.component_chunks.get(name)!
    const component_scope = new SymbolScope(scope)

    for (const parameter of component.params) {
      component_scope.declare(parameter)
    }

    resolve_scopes(component.body, component_scope)
    analyze_tree(component.body)

    const dirty = create_dirty_context(['$it', ...component.params])

    analyze_dirty(component.body, dirty)

    builder.fill_chunk(component_chunk_id, dirty.tracked_variables, () => lower_node(component.body, builder, undefined))
  }

  return builder
}

function lower_node(node: StillflowNode, builder: BytecodeBuilder, parent_slot: SlotId | undefined): SlotId[] {
  switch (node.kind) {
    case 'Element': {
      const element_slot = builder.allocate_slot()

      node.meta.analysis.slot = element_slot

      const tag_id = builder.intern(node.tag)

      builder.emit_mount(Opcode.CREATE_ELEMENT, tag_id, element_slot)

      for (const [key, value] of Object.entries(node.static_properties)) {
        builder.emit_mount(Opcode.SET_STATIC_PROP, element_slot, builder.intern(key), builder.intern(value))
      }

      for (const [key, expression] of Object.entries(node.dynamic_properties)) {
        const key_id = builder.intern(key)
        const expression_id = builder.intern(expression.code)
        const property_mask = node.dynamic_properties_mask[key]

        builder.emit_mount(Opcode.SET_DYNAMIC_PROP, element_slot, key_id, expression_id)

        if (property_mask !== 0) {
          builder.emit_patch(Opcode.UPDATE_DYNAMIC_PROP, element_slot, key_id, expression_id, property_mask)
        }
      }

      if (parent_slot !== undefined) {
        builder.emit_mount(Opcode.APPEND, parent_slot, element_slot)
      }

      for (const child of node.children) {
        lower_node(child, builder, element_slot)
      }

      return [element_slot]
    }

    case 'Text': {
      const text_slot = builder.allocate_slot()

      node.meta.analysis.slot = text_slot

      if (typeof node.value !== 'string') {
        const expression_id = builder.intern(node.value.code)
        const text_mask = node.meta.analysis.dirty_mask

        builder.emit_mount(Opcode.CREATE_DYNAMIC_TEXT, expression_id, text_slot)

        if (text_mask !== 0) {
          builder.emit_patch(Opcode.UPDATE_DYNAMIC_TEXT, expression_id, text_slot, text_mask)
        }
      } else {
        const string_id = builder.intern(node.value)

        builder.emit_mount(Opcode.CREATE_STATIC_TEXT, string_id, text_slot)
      }

      if (parent_slot !== undefined) {
        builder.emit_mount(Opcode.APPEND, parent_slot, text_slot)
      }

      return [text_slot]
    }

    case 'For': {
      if (parent_slot === undefined) {
        throw new Error(`"For"-node must have a parent container "Element"-node`)
      }

      const captures = node.dirty_context.tracked_variables

      const select_chunk = builder.with_chunk(captures, () => builder.emit_mount(Opcode.READ_EXPRESSION, builder.intern(node.select.code)))

      const body_chunk = builder.compile_subtree(captures, () => lower_node(node.body[0], builder, undefined))

      if (body_chunk.root_slots.length > 1) {
        throw new Error(`For-node should not contain more than one child`)
      }

      const root_item_slot = body_chunk.root_slots[0]

      const capture_ids = captures.map(name => builder.intern(name))

      const for_mask = node.meta.analysis.dirty_mask

      const instructions = [
        body_chunk.id,
        select_chunk.id,
        parent_slot,
        root_item_slot,
        for_mask,
        capture_ids.length,
        ...capture_ids
      ]

      builder.emit_mount(Opcode.FOR, ...instructions)

      if (for_mask !== 0) {
        builder.emit_patch(Opcode.FOR, ...instructions)
      }

      return undefined
    }

    case 'Expression': {
      builder.emit_mount(Opcode.READ_EXPRESSION, builder.intern(node.code))

      return undefined
    }

    case 'Call': {
      const call_slot = builder.allocate_controller_slot()

      node.meta.analysis.slot = call_slot

      const component_name_id = builder.intern(node.component_name)
      const property_entries = Object.entries(node.properties)
      const encoded_properties: number[] = []

      for (const [key, expression] of property_entries) {
        encoded_properties.push(builder.intern(key), builder.intern(expression.code))
      }

      builder.emit_mount(
        Opcode.MOUNT_CALL,
        component_name_id,
        parent_slot ?? -1,
        call_slot,
        property_entries.length,
        ...encoded_properties
      )

      const call_mask = node.meta.analysis.dirty_mask

      if (call_mask !== 0) {
        builder.emit_patch(
          Opcode.PATCH_CALL,
          call_slot,
          call_mask,
          property_entries.length,
          ...encoded_properties
        )
      }

      return [call_slot]
    }
  }
}