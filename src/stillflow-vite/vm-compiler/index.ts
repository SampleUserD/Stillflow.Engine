export type { StillflowNode } from "@/stillflow-vite/vm-compiler/nodes"
export { Fabric } from "@/stillflow-vite/vm-compiler/fabric"
export { SymbolScope } from "@/stillflow-vite/vm-compiler/pass.scopes"

export { analyze_tree } from "@/stillflow-vite/vm-compiler/pass.analyzer"
export { resolve_scopes } from "@/stillflow-vite/vm-compiler/pass.scopes"
export { lower_to_bytecode } from "@/stillflow-vite/vm-compiler/pass.lowering"