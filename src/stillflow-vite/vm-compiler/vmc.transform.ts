export type VMCError = {
  message: string,
  position: [number, number]
}

export type VMCResult<I, O, COut> =
  | { ok: true, value: O, rest: I, ctx: COut }
  | { ok: false, error: VMCError }

export type VMCTransform<I, O, CIn, COut> = (input: I, ctx: CIn) => VMCResult<I, O, COut>