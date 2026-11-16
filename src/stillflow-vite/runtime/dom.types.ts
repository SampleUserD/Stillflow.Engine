import { Properties } from "./properties"
import { Binding } from "@/stillflow-vite/babel-vm/index"

export type AnyDOM<V> = Binding<Properties<V, any>>