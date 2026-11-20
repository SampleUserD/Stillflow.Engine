import { VMTarget } from "@/stillflow-vite/vm-abstract/vm.target"

export interface VMStillflowOptions {
  targets: Record<number, VMTarget>
}