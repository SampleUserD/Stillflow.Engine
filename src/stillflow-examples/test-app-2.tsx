import { runtime } from "../index.ts"

const { jsxdom } = runtime

export function Item(props: { controller: any }) {
  return <jsxdom.div on: click={() => props.controller()}>Hello</jsxdom.div>
}