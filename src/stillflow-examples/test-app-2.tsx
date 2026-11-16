import { runtime } from "../index.ts"

const { jsxdom } = runtime

export function Item() {
  return <jsxdom.div>Hello</jsxdom.div>
}