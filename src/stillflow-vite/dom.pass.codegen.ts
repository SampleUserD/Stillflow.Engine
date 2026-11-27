import { Opcode } from "@/stillflow-vite/vm-compiler/codes"
import { BytecodeBuilder, BytecodeChunk, Interner } from "@/stillflow-vite/vm-compiler/bytecode-builder"
import { ChunkId, InternId } from "@/stillflow-vite/vm-compiler/nodes"
import { unpack_local } from "@/stillflow-vite/vm-abstract"

export function emit_dirty_prologue(tracked_variables: readonly string[], source: (name: string, bit: number) => string): string[] {
  if (tracked_variables.length === 0) {
    return []
  }

  const lines: string[] = ['let __dirty = 0;']

  for (let index = 0; index < tracked_variables.length; index++) {
    const name = tracked_variables[index]
    const bit = 1 << index

    lines.push(source(name, bit))
  }

  lines.push('if (__dirty === 0) return;')

  return lines
}

export interface GeneratedCode {
  module: string[]
  mount: string[]
  patch: string[]
}

export function generate_dom(builder: BytecodeBuilder): GeneratedCode {
  const module_code: string[] = []
  const emitted_for_chunks = new Set<ChunkId>()
  const emitted_component_chunks = new Set<ChunkId>()

  function dom_ref(slot: number) {
    return builder.is_controller_slot[slot] ? `__s${slot}.element` : `__s${slot}`
  }

  function emit_stream(stream: number[], interner: Interner<string>): string[] {
    const lines: string[] = []

    let pointer: number = 0

    while (pointer < stream.length) {
      const opcode = stream[pointer++]
      const local = unpack_local(opcode)

      switch (local) {
        case Opcode.CREATE_ELEMENT: {
          const tag = interner.get(stream[pointer++] as InternId)
          const slot = stream[pointer++]

          lines.push(`const __s${slot} = document.createElement(${JSON.stringify(tag)});`)

          break
        }

        case Opcode.SET_STATIC_PROP: {
          const slot = stream[pointer++]
          const key = interner.get(stream[pointer++] as InternId)
          const value = interner.get(stream[pointer++] as InternId)

          lines.push(`__s${slot}.setAttribute(${JSON.stringify(key)}, ${JSON.stringify(value)});`)

          break
        }

        case Opcode.SET_DYNAMIC_PROP: {
          const slot = stream[pointer++]
          const key = interner.get(stream[pointer++] as InternId)
          const expression = interner.get(stream[pointer++] as InternId)

          lines.push(`__s${slot}.${key} = ${expression};`)

          break
        }

        case Opcode.UPDATE_DYNAMIC_PROP: {
          const slot = stream[pointer++]
          const key = interner.get(stream[pointer++] as InternId)
          const expression = interner.get(stream[pointer++] as InternId)
          const property_mask = stream[pointer++]

          lines.push(`if(__dirty & ${property_mask}) __s${slot}.${key} = ${expression};`)

          break
        }

        case Opcode.CREATE_STATIC_TEXT: {
          const text = interner.get(stream[pointer++] as InternId)
          const slot = stream[pointer++]

          lines.push(`const __s${slot} = document.createTextNode(${JSON.stringify(text)});`)

          break
        }

        case Opcode.CREATE_DYNAMIC_TEXT: {
          const expression = interner.get(stream[pointer++] as InternId)
          const slot = stream[pointer++]

          lines.push(`const __s${slot} = document.createTextNode(${expression});`)

          break
        }

        case Opcode.UPDATE_DYNAMIC_TEXT: {
          const expression = interner.get(stream[pointer++] as InternId)
          const slot = stream[pointer++]
          const mask = stream[pointer++]

          lines.push(`if (__dirty & ${mask}) __s${slot}.data = ${expression};`)

          break
        }

        case Opcode.APPEND: {
          const parent = stream[pointer++]
          const child = stream[pointer++]

          lines.push(`__s${parent}.appendChild(__s${child});`)

          break
        }

        case Opcode.READ_EXPRESSION: {
          const expression = interner.get(stream[pointer++] as InternId)

          lines.push(expression)

          break
        }

        case Opcode.FOR: {
          const body_chunk_id = stream[pointer++] as ChunkId
          const select_chunk_id = stream[pointer++] as ChunkId
          const container_slot = stream[pointer++]
          const root_item_slot = stream[pointer++]
          stream[pointer++]
          const capture_count = stream[pointer++]

          const captures: string[] = []

          for (let index = 0; index < capture_count; index++) {
            captures.push(interner.get(stream[pointer++] as InternId))
          }

          if (!emitted_for_chunks.has(body_chunk_id)) {
            emitted_for_chunks.add(body_chunk_id)
            emit_for_function(builder.chunks[body_chunk_id], root_item_slot, interner)
          }

          const select_chunk = builder.chunks[select_chunk_id]
          const select_expression = emit_stream(select_chunk.mount, interner)[0]

          const args = [`__s${container_slot}`, select_expression, ...captures].join(', ')

          lines.push(`__for_${body_chunk_id}(${args});`)

          break
        }

        case Opcode.MOUNT_CALL: {
          const component_name_id = stream[pointer++] as InternId
          const parent_slot = stream[pointer++]
          const call_slot = stream[pointer++]
          const properties_count = stream[pointer++]

          const property_pairs: string[] = []

          for (let index = 0; index < properties_count; index++) {
            const key = interner.get(stream[pointer++] as InternId)
            const expression = interner.get(stream[pointer++] as InternId)

            property_pairs.push(`${JSON.stringify(key)}: ${expression}`)
          }

          const component_name = interner.get(component_name_id)

          const chunk_id = builder.component_chunks.get(component_name)!

          if (!emitted_component_chunks.has(chunk_id)) {
            emitted_component_chunks.add(chunk_id)
            emit_component_function(builder.chunks[chunk_id], component_name, interner)
          }

          if (parent_slot !== -1) {
            lines.push(`const __s${call_slot} = __comp_${component_name}(${dom_ref(parent_slot)}, { ${property_pairs.join(', ')} }, $it)`)
          } else {
            lines.push(`const __s${call_slot} = __comp_${component_name}(null, { ${property_pairs.join(', ')} }, $it)`)
          }

          break
        }

        case Opcode.PATCH_CALL: {
          const call_slot = stream[pointer++]
          const call_mask = stream[pointer++]
          const properties_count = stream[pointer++]

          const property_pairs: string[] = []

          for (let index = 0; index < properties_count; index++) {
            const key = interner.get(stream[pointer++] as InternId)
            const expression = interner.get(stream[pointer++] as InternId)

            property_pairs.push(`${JSON.stringify(key)}: ${expression}`)
          }

          lines.push(`if (__dirty & ${call_mask}) __s${call_slot}.patch({ ${property_pairs.join(', ')} }, $it)`)

          break
        }

        case Opcode.SET_EVENT: {
          const slot = stream[pointer++]
          const key = interner.get(stream[pointer++] as InternId)
          const handler = interner.get(stream[pointer++] as InternId)
          const data = interner.get(stream[pointer++] as InternId)

          lines.push(`${dom_ref(slot)}.$$${key} = ${handler};`)
          lines.push(`${dom_ref(slot)}.$$${key}_data = ${data};`)
          lines.push(`delegate_event(${JSON.stringify(key)})`)

          break
        }

        case Opcode.UPDATE_EVENT_DATA: {
          const slot = stream[pointer++]
          const key = interner.get(stream[pointer++] as InternId)
          const data = interner.get(stream[pointer++] as InternId)
          const data_mask = stream[pointer++]

          lines.push(`if(__dirty & ${data_mask}) { ${dom_ref(slot)}.$$${key}_data = ${data}; }`)

          break
        }
      }
    }

    return lines
  }

  function emit_for_function(body_chunk: BytecodeChunk, root_item_slot: number, interner: Interner<string>): void {
    const mount_body = emit_stream(body_chunk.mount, interner)
    const patch_body = emit_stream(body_chunk.patch, interner)

    const params = ['$parent', '$items', ...body_chunk.captures].join(', ')

    const prologue = emit_dirty_prologue(body_chunk.captures, (name, bit) => {
      return `if ($next !== undefined) { $it = $next; __dirty |= ${bit}; }`
    })

    const capture_bindings =
      body_chunk.captures.length > 0
        ? `let ${body_chunk.captures.map(capture => `__cap_${capture} = ${capture}`).join(', ')};`
        : String()

    const code = `
      function __for_${body_chunk.id}(${params}) {
        ${capture_bindings}
        reconcile_list($parent, $items, ($it, $index) => {
          ${mount_body.join('\n   ')}

          return {
            element: ${dom_ref(root_item_slot)},
            patch($next) {
              ${prologue.join('\n     ')}
              ${patch_body.join('\n     ')}
            }
          }
        });
      }
    `.trim()

    module_code.push(code)
  }

  function emit_component_function(target_chunk: BytecodeChunk, component_name: string, interner: Interner<string>) {
    if (target_chunk.root_slots.length > 1) {
      throw new Error(`Chunk #${target_chunk.id} ("${component_name}") has multiple DOM roots`)
    }

    const params = ['$parent', '$props', '$it']

    const captures = target_chunk.captures.filter(name => params.includes(name) === false)

    const mount_body = emit_stream(target_chunk.mount, interner)
    const patch_body = emit_stream(target_chunk.patch, interner)

    const has_properties = captures.length > 0
    const properties_list = captures.join(', ')

    const properties_init = has_properties ? `let { ${properties_list} } = $props;` : String()

    const dirty_prologue = emit_dirty_prologue(target_chunk.captures, (name, bit) => {
      if (params.includes(name)) {
        return `if ($next !== undefined) { $it = $next; __dirty |= ${bit}; }`
      } else {
        return `if (${name} !== $props.${name}) { ${name} = $props.${name}; __dirty |= ${bit}; }`
      }
    })

    const code = `
      function __comp_${component_name}(${params.join(', ')}) {
        ${properties_init}
        ${mount_body.join('\n   ')}

        if ($parent !== null) {
          $parent.appendChild(${dom_ref(target_chunk.root_slots[0])});
        }

        return {
          element: ${dom_ref(target_chunk.root_slots[0])},
          patch($props, $next) {
            ${dirty_prologue.join('\n      ')}
            ${patch_body.join('\n      ')}
          }
        }
      }
    `.trim()

    module_code.push(code)
  }

  const root_chunk = builder.chunks[builder.root_chunk_id]
  const mount_code = emit_stream(root_chunk.mount, builder.interner)
  const patch_code = emit_stream(root_chunk.patch, builder.interner)

  return {
    module: module_code,
    mount: mount_code,
    patch: patch_code
  }
}