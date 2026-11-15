import { types } from "@babel/core"
import { VMGenerated } from "@/stillflow-aot/vm/vm.generated"

export function build(vm: VMGenerated): types.FunctionExpression {
  // function(p0, p1, ...) { body }
  const inner = types.functionExpression(
    null,
    vm.parameters,
    types.blockStatement(vm.body)
  )

  // (function(p0, p1, ...) { body })(v0, v1, ...)
  const call = types.callExpression(inner, vm.values as types.Expression[])

  // function(root, context) { return (function(p0, ...) { body })(v0, ...) }
  return types.functionExpression(
    null,
    [types.identifier('root'), types.identifier('context')],
    types.blockStatement([types.returnStatement(call)])
  )
}