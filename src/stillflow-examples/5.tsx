import { runtime } from "stillflow.engine"

const { dom, $ } = runtime

const { div, span } = dom

function TreeNode(props: { depth: number }) {
  return (
    <div>
      <span>Hello {props.depth}</span>
      <TreeNode depth={props.depth + 1} />
    </div>
  )
}

let depth = 0

const { app, root } = $(
  <div>
    <TreeNode depth={depth + 5} />
  </div>
)({})

document.body.appendChild(root)