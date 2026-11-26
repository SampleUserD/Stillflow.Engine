export interface VMCScope {
  path: number[]
}

export interface VMCFragment {
  opcode: number,
  args: number[]
}

export interface VMCPlan {
  fragments: VMCFragment[]
  descend: boolean
}
