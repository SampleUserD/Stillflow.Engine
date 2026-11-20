import { Toolkit } from "@/stillflow-vite/vm-abstract"
import { Diagnostics } from "@/stillflow-vite/vm-compiler/vmc.diagnostics"

export type Transform<I, O> = (description: I, context: Toolkit, diagnostics: Diagnostics[]) => O