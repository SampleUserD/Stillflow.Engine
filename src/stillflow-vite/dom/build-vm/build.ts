import * as vm from '@/stillflow-vite/babel-vm/index'
import { run } from '@/stillflow-vite/dom/build-vm/run'

import { Template } from "@/stillflow-vite/dom/build-vm/template"
import { TransformResult } from '@/stillflow-vite/dom/build-vm/transform'
import { Environment } from "@/stillflow-vite/dom/environment"
import { types } from '@babel/core'

type VMGenerated = {
  payload: vm.Payload,
  body: types.Statement[],
  outer: types.Statement[]
}

function build_imports(): types.Statement[] {
  return [
    types.importDeclaration(
      [
        types.importSpecifier(
          types.identifier('DELEGATOR'),
          types.identifier('DELEGATOR')
        ),
      ],
      types.stringLiteral('stillflow.engine')
    ),
  ]
}

function build_transform(transform: TransformResult, index: number): types.Statement[] {
  return [
    ...transform.outer,
    types.variableDeclaration('const', [
      types.variableDeclarator(
        types.identifier(`transform${index}`),
        types.functionExpression(
          null,
          transform.parameters,
          types.blockStatement([
            ...transform.body,
            types.returnStatement(
              transform.return_expression
            )
          ])
        )
      )
    ])
  ]
}

function build_root(transform: TransformResult, index: number): types.Statement[] {
  return [
    types.variableDeclaration('const', [
      types.variableDeclarator(
        types.identifier(`root${index}`),
        types.callExpression(
          types.identifier(`transform${index}`),
          [
            types.callExpression(
              types.memberExpression(
                types.identifier('document'),
                types.identifier('createDocumentFragment')
              ),
              []
            ),
            ...transform.payloads.values.map(value => transform.payloads.resolve(value)) as types.Expression[]
          ]
        )
      )
    ])
  ]
}

function build_elements(index: number): types.Statement[] {
  return [
    types.variableDeclaration('const', [
      types.variableDeclarator(
        types.identifier(`elements${index}`),
        types.arrayExpression([])
      )
    ])
  ]
}

export function build_module_from(root: Template, environment: Environment) {
  const vm_generated: VMGenerated[] = []

  for (const [template, index] of environment.template_map) {
    vm_generated[index] = run(template)
  }

  const body: types.Statement[] = []

  for (const [transform, index] of environment.transform_map) {
    body.push(...build_transform(transform, index))
    body.push(...build_root(transform, index))
    body.push(...build_elements(index))
  }

  const rootIndex = environment.template_map.get(root)!

  body.push(
    types.variableDeclaration('const', [
      types.variableDeclarator(
        types.identifier('set_data'),
        types.memberExpression(
          types.callExpression(
            types.memberExpression(
              types.identifier('Object'),
              types.identifier('getOwnPropertyDescriptor')
            ),
            [
              types.memberExpression(
                types.identifier('CharacterData'),
                types.identifier('prototype')
              ),
              types.stringLiteral('data')
            ]
          ),
          types.identifier('set')
        )
      ),
      types.variableDeclarator(
        types.identifier('set_text'),
        types.memberExpression(
          types.callExpression(
            types.memberExpression(
              types.identifier('Object'),
              types.identifier('getOwnPropertyDescriptor')
            ),
            [
              types.memberExpression(
                types.identifier('Node'),
                types.identifier('prototype')
              ),
              types.stringLiteral('textContent')
            ]
          ),
          types.identifier('set')
        )
      ),
      types.variableDeclarator(
        types.identifier('replace_children'),
        types.memberExpression(
          types.memberExpression(
            types.identifier('Element'),
            types.identifier('prototype')
          ),
          types.identifier('replaceChildren')
        )
      ),
    ])
  )

  for (let id = 0; id < vm_generated.length; id++) {
    body.push(...vm_generated[id].outer)
    body.push(
      types.variableDeclaration('const', [
        types.variableDeclarator(
          types.identifier(`vm${id}`),
          vm.build(vm_generated[id])
        )
      ])
    )
  }

  body.push(
    types.variableDeclaration('const', [
      types.variableDeclarator(types.identifier('app'), types.identifier(`vm${rootIndex}`)),
      types.variableDeclarator(types.identifier('root'), types.identifier(`root${rootIndex}`))
    ])
  )

  body.push(
    types.returnStatement(
      types.objectExpression([
        types.objectProperty(types.identifier('app'), types.identifier('app')),
        types.objectProperty(types.identifier('root'), types.identifier('root'))
      ])
    )
  )

  return types.program([
    ...build_imports(),
    types.returnStatement(
      types.functionExpression(
        types.identifier('create_app'),
        [],
        types.blockStatement(body)
      )
    )
  ])
}