import { runtime } from "stillflow.engine"

const { dom, $ } = runtime

function TreeNode(props: { depth: number }) {
  if (props.depth >= 10) {
    return <dom.div>Hello!</dom.div>
  }

  return (
    <dom.div style: marginLeft={`${props.depth * 2}px`}>
      <dom.span>Hello ${props.depth}</dom.span>
      <TreeNode depth={props.depth + 1} />
    </dom.div>
  )
}

let depth = 0

const { app, root } = $(<TreeNode depth={depth} />)

document.body.appendChild(root)