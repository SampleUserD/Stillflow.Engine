export type { StillflowNode } from "@/stillflow-vite/vm-compiler/nodes"
export { Fabric } from "@/stillflow-vite/vm-compiler/fabric"
export { SymbolScope } from "@/stillflow-vite/vm-compiler/pass.scopes"

export { create_dirty_context } from "@/stillflow-vite/vm-compiler/dirty"
export { analyze_dirty } from "@/stillflow-vite/vm-compiler/pass.analyze-dirty"
export { analyze_tree } from "@/stillflow-vite/vm-compiler/pass.analyze-dynamic"
export { resolve_scopes } from "@/stillflow-vite/vm-compiler/pass.scopes"
export { lower_to_bytecode } from "@/stillflow-vite/vm-compiler/pass.lowering"