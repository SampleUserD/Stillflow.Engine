import { Opcode } from "@/stillflow-vite/vm-compiler/codes"
import { BytecodeBuilder, BytecodeChunk, Interner } from "@/stillflow-vite/vm-compiler/bytecode-builder"
import { ChunkId, InternId } from "@/stillflow-vite/vm-compiler/nodes"
import { unpack_local } from "@/stillflow-vite/vm-abstract"

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

          lines.push(`__s${slot}.data = ${expression};`)

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
          const properties_count = stream[pointer++]

          const property_pairs: string[] = []

          for (let index = 0; index < properties_count; index++) {
            const key = interner.get(stream[pointer++] as InternId)
            const expression = interner.get(stream[pointer++] as InternId)

            property_pairs.push(`${JSON.stringify(key)}: ${expression}`)
          }

          lines.push(`__s${call_slot}.patch({ ${property_pairs.join(', ')} }, $it)`)

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
              $it = $next;
              ${patch_body.join('\n     ')}
            }
          }
        });
      }
    `.trim()

    module_code.push(code)
  }

  function emit_component_function(target_chunk: BytecodeChunk, component_name: string, interner: Interner<string>) {
    if (target_chunk.root_slot === undefined) {
      throw new Error(`Component chunk #${target_chunk.id} (component ${component_name}) has no root DOM slot`)
    }

    const mount_body = emit_stream(target_chunk.mount, interner)
    const patch_body = emit_stream(target_chunk.patch, interner)

    const has_properties = target_chunk.captures.length > 0
    const properties_list = target_chunk.captures.join(', ')

    const properties_init = has_properties ? `let { ${properties_list} } = $props;` : String()
    const properties_update = has_properties ? `({ ${properties_list} } = $props);` : String()

    const params = ['$parent', '$props', '$it']

    const code = `
      function __comp_${component_name}(${params.join(', ')}) {
        ${properties_init}
        ${mount_body.join('\n   ')}

        if ($parent !== null) {
          $parent.appendChild(__s${target_chunk.root_slot});
        }

        return {
          element: ${dom_ref(target_chunk.root_slot)},
          patch($props, $next) {
            $it = $next;
            ${properties_update}
            ${patch_body.join('\n     ')}
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