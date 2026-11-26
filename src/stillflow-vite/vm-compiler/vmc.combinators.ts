import { VMCError, VMCResult, VMCTransform } from "@/stillflow-vite/vm-compiler/vmc.transform"

type Any = VMCTransform<any, any, any, any>

type TailOut<Tail extends Any[], O, CO, A extends any[] = []> =
  Tail extends [VMCTransform<O, infer O2, infer CIn2, infer CO2>, ...infer Rest2]
  ? CO extends CIn2
  ? Rest2 extends []
  ? { out: [...A, O2], ctx: CO2 }
  : Rest2 extends Any[]
  ? TailOut<Rest2, O2, CO2, [...A, O2]>
  : never
  : never
  : never

type SequenceOf<F extends Any[]> =
  F extends [VMCTransform<infer I, infer O1, infer CI1, infer CO1>, ...infer Rest]
  ? Rest extends Any[]
  ? Rest extends []
  ? VMCTransform<I, [O1], CI1, CO1>
  : TailOut<Rest, O1, CO1, [O1]> extends { out: infer Os, ctx: infer CoF }
  ? VMCTransform<I, Os, CI1, CoF>
  : never
  : never
  : never

type Valid<F extends Any[]> = [SequenceOf<F>] extends [never] ? never : F

export const bind =
  <I, A, B, CIn, CMid, COut>
    (t: VMCTransform<I, A, CIn, CMid>, f: (a: A) => VMCTransform<I, B, CMid, COut>): VMCTransform<I, B, CIn, COut> => {
    return (input, ctx) => {
      const r = t(input, ctx)

      if (r.ok === false) {
        return { ok: false, error: r.error }
      }

      return f(r.value)(r.rest, r.ctx)
    }
  }

export const choice =
  <I, O, CIn1, CIn2, COut1, COut2>
    (f: VMCTransform<I, O, CIn1, COut1>, g: VMCTransform<I, O, CIn2, COut2>): VMCTransform<I, O, CIn1 & CIn2, COut1 | COut2> => {
    return (input, ctx) => {
      const rf = f(input, ctx)

      return rf.ok ? rf : g(input, ctx)
    }
  }

export const many = <I, A, C>(f: VMCTransform<I, A, C, C>): VMCTransform<I, A[], C, C> => (input, ctx) => {
  const out: A[] = []

  let current: I = input

  while (true) {
    const r = f(current, ctx)

    if (r.ok === false) {
      return { ok: true, value: out, rest: current, ctx }
    }

    out.push(r.value)

    current = r.rest

    if (current === input) {
      break
    }
  }

  return { ok: true, value: out, rest: current, ctx }
}

export const iterate = <I, A, C>(f: VMCTransform<I, A, C, C>): VMCTransform<I[], A[], C, C> => (input, ctx) => {
  const out: A[] = []

  let current: C = ctx

  for (let index = 0; index < input.length; index++) {
    const r = f(input[index], current)

    if (r.ok === false) {
      return { ok: true, value: out, rest: input, ctx }
    }

    current = r.ctx

    out.push(r.value)
  }

  return { ok: true, value: out, rest: input, ctx: current }
}

export const sequence = <F extends Any[]>(...fs: F & Valid<F>): SequenceOf<F> => {
  const result = (input: any, ctx: any) => {
    const values: any[] = []

    let rest: any = input
    let current_context: any = ctx

    for (const f of fs as unknown as Any[]) {
      const r = f(rest, current_context)

      if (r.ok === false) {
        return { ok: false, error: r.error }
      }

      values.push(r.value)

      rest = r.rest
      current_context = r.ctx
    }

    return { ok: true, value: values, rest, ctx: current_context }
  }

  return result as SequenceOf<F>
}

const separate_by_internal =
  <I, A, S, C>
    (f: VMCTransform<I, A, C, C>, g: VMCTransform<I, S, C, C>): VMCTransform<I, [A, ...A[]], C, C> => {
    return (input, ctx) => {
      const first = f(input, ctx)

      if (first.ok === false) {
        return { ok: false, error: first.error }
      }

      const items = [first.value] as [A, ...A[]]

      let rest = first.rest
      let current = ctx

      while (true) {
        const snap_rest = rest, snap_ctx = current

        const s = g(rest, current)

        if (s.ok === false) {
          break
        }

        const next = f(s.rest, s.ctx)

        if (next.ok === false) {
          rest = snap_rest
          current = snap_ctx
          break
        }

        items.push(next.value)

        rest = next.rest
        current = next.ctx

        if (rest === snap_rest) {
          break
        }
      }

      return { ok: true, value: items, rest, ctx: current }
    }
  }

export const separate_by =
  <I, A, S, C>
    (f: VMCTransform<I, A, C, C>, g: VMCTransform<I, S, C, C>): VMCTransform<I, A[], C, C> => {
    return (input, ctx) => {
      const r = separate_by_internal(f, g)(input, ctx)

      return r.ok ? r : { ok: true, value: [], rest: input, ctx }
    }
  }

export const map =
  <I, A, B, CIn, COut>
    (t: VMCTransform<I, A, CIn, COut>, f: (a: A) => B): VMCTransform<I, B, CIn, COut> => {
    return (input, ctx) => {
      const r = t(input, ctx)

      if (r.ok === false) {
        return { ok: false, error: r.error }
      }

      return { ok: true, value: f(r.value), rest: r.rest, ctx: r.ctx }
    }
  }

export const pure = <I, O, C>(o: O): VMCTransform<I, O, C, C> => (input, ctx) => ({ ok: true, value: o, rest: input, ctx })

export const map_error =
  <I, A, CIn, COut>
    (t: VMCTransform<I, A, CIn, COut>, f: (a: VMCError[]) => VMCError[]): VMCTransform<I, A, CIn, COut> => {
    return (input, ctx) => {
      const r = t(input, ctx)

      if (r.ok === false) {
        return { ok: false, error: f(r.error) }
      }

      return { ok: true, value: r.value, rest: r.rest, ctx: r.ctx }
    }
  }

export const local =
  <I, O, CIn, CExt, COut>
    (w: (ctx: CIn) => CExt, t: VMCTransform<I, O, CExt, COut>): VMCTransform<I, O, CIn, CIn> => {
    return (input, ctx) => {
      const r = t(input, w(ctx))

      if (r.ok === false) {
        return { ok: false, error: r.error }
      }

      return { ok: true, value: r.value, rest: r.rest, ctx }
    }
  }

