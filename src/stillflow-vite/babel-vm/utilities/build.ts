import { Payload } from "@/stillflow-vite/babel-vm"
import { types } from "@babel/core"

export function build(vm: { payload: Payload, body: types.Statement[] }): types.FunctionExpression {
  // function(p0, p1, ...) { body }
  const inner = types.functionExpression(
    null,
    vm.payload.parameters.map(parameter => types.identifier(parameter)),
    types.blockStatement(vm.body)
  )

  // (function(p0, p1, ...) { body })(v0, v1, ...)
  const call = types.callExpression(inner, vm.payload.values.map(value => vm.payload.resolve(value)) as types.Expression[])

  // function(root, context) { return (function(p0, ...) { body })(v0, ...) }
  return types.functionExpression(
    null,
    [types.identifier('root'), types.identifier('context')],
    types.blockStatement([types.returnStatement(call)])
  )
}