import { Stillflow, State, operators, Collection } from "../index.js"
import { dom } from "../stillflow-adapters/dom/index.js"

const state = new State()
const stillflow = new Stillflow<{ x: number }>(state)

const div = dom.div<{ y: { x: number } }>({
  props: {
    style: {
      background: 'red'
    }
  },
  children: [
    dom.lens(
      dom.text((ctx: { x: number }) => String(ctx.x)),
      context => context.y
    )
  ]
}, (root, context) => {
  if (context.y.x === 10) {
    root.style.background = 'green'
  }
})

document.body.appendChild(div.create({ y: { x: 10 } }))

div.update({ y: { x: 10 } })