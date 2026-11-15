import { Properties } from "@/stillflow-adapters/dom/properties/properties"
import { Binding } from "@/stillflow-vm/binding"

export type AnyDOM<V> = Binding<Properties<V, any>>