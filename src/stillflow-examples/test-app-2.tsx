import { runtime } from "../index.ts"

const { jsxdom } = runtime

export function Item(props: { controller: any }) {
  return <jsxdom.div sf:on-click={() => props.controller()}>{(context: number) => context}</jsxdom.div>
}