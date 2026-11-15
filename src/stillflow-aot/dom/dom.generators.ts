// dom.compile-vm.keyed.ts
import * as t from '@babel/types'
import * as vm from '@vm/index'
import type { Expression } from '@babel/types'

import { Codes } from './dom.codes'
import { Context } from './dom.context'
import { SF_CONTEXT, SF_HANDLERS, SF_LISTENED } from './dom.symbols'
import { VMConfig } from '@/stillflow-aot/vm/vm.config'

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------

/** sf_node_cache[N] */
function nodeCache(index: number): Expression {
  return t.memberExpression(t.identifier('sf_node_cache'), t.numericLiteral(index), true)
}

/** sf_text_cache[N] */
function textCache(index: number): Expression {
  return t.memberExpression(t.identifier('sf_text_cache'), t.numericLiteral(index), true)
}

/** pN */
function param(index: number): Expression {
  return t.identifier(`p${index}`)
}

/** expr(context) */
function callWithContext(callee: Expression): Expression {
  return t.callExpression(callee, [t.identifier('context')])
}

// ---------------------------------------------------------------
// generators
// ---------------------------------------------------------------

export const generators: VMConfig<Context>['generators'] = {
  // IF = 0
  [Codes.IF](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]
    const handlerIndex = context.payload.add(handler)

    return [
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('element'), nodeCache(container))
        ]),
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('condition'),
            callWithContext(param(handlerIndex))
          )
        ]),
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(
              t.memberExpression(t.identifier('element'), t.identifier('style')),
              t.identifier('display')
            ),
            t.conditionalExpression(
              t.identifier('condition'),
              t.stringLiteral(''),
              t.stringLiteral('none')
            )
          )
        )
      ])
    ]
  },

  // FOR = 2
  [Codes.FOR](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const select = context.functions[bytecode[offset + 3]]
    const template = context.templates[bytecode[offset + 4]]

    const selectIndex = context.payload.add(select)
    const applierIndex = context.payload.add(template)        // → vmN
    const rootIndex = context.payload.add(template.root)      // → rootN (ленивый DOM)
    const elementsIndex = context.payload.add([])

    const elements = () => param(elementsIndex)
    const applier = () => param(applierIndex)
    const templateRoot = () => t.callExpression(param(rootIndex), [])

    return [
      t.blockStatement([
        // const items = p<select>(context);
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('items'), callWithContext(param(selectIndex)))
        ]),
        // const target = sf_node_cache[container];
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('target'), nodeCache(container))
        ]),
        // const { clears, addes, swaps, removes, updates } = items.flush();
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern([
              t.objectProperty(t.identifier('clears'), t.identifier('clears'), false, true),
              t.objectProperty(t.identifier('addes'), t.identifier('addes'), false, true),
              t.objectProperty(t.identifier('swaps'), t.identifier('swaps'), false, true),
              t.objectProperty(t.identifier('removes'), t.identifier('removes'), false, true),
              t.objectProperty(t.identifier('updates'), t.identifier('updates'), false, true)
            ]),
            t.callExpression(t.memberExpression(t.identifier('items'), t.identifier('flush')), [])
          )
        ]),

        // if (clears) { ... }
        t.ifStatement(
          t.identifier('clears'),
          t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('freelist'),
                t.callExpression(t.memberExpression(elements(), t.identifier('splice')), [t.numericLiteral(0)])
              )
            ]),
            t.forOfStatement(
              t.variableDeclaration('const', [t.variableDeclarator(t.identifier('element'))]),
              t.identifier('freelist'),
              t.blockStatement([
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('element'), t.identifier(SF_HANDLERS)),
                    t.identifier('undefined')
                  )
                )
              ])
            ),
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier('target'), t.identifier('textContent')),
                t.stringLiteral('')
              )
            )
          ])
        ),

        // if (addes > 0) { ... }
        t.ifStatement(
          t.binaryExpression('>', t.identifier('addes'), t.numericLiteral(0)),
          t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('fragment'),
                t.callExpression(
                  t.memberExpression(t.identifier('document'), t.identifier('createDocumentFragment')),
                  []
                )
              )
            ]),
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('elements'),
                t.newExpression(t.identifier('Array'), [t.identifier('addes')])
              )
            ]),
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('old_size'),
                t.memberExpression(elements(), t.identifier('length'))
              )
            ]),
            t.forStatement(
              t.variableDeclaration('let', [t.variableDeclarator(t.identifier('i'), t.numericLiteral(0))]),
              t.binaryExpression('<', t.identifier('i'), t.identifier('addes')),
              t.updateExpression('++', t.identifier('i')),
              t.blockStatement([
                // const element = p<root>().cloneNode(true);
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier('element'),
                    t.callExpression(
                      t.memberExpression(templateRoot(), t.identifier('cloneNode')),
                      [t.booleanLiteral(true)]
                    )
                  )
                ]),
                // element[SF_HANDLERS] = p<root>()[SF_HANDLERS];
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('element'), t.identifier(SF_HANDLERS)),
                    t.memberExpression(templateRoot(), t.identifier(SF_HANDLERS))
                  )
                ),
                // element[SF_CONTEXT] = items.at(i + old_size);
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('element'), t.identifier(SF_CONTEXT)),
                    t.callExpression(
                      t.memberExpression(t.identifier('items'), t.identifier('at')),
                      [t.binaryExpression('+', t.identifier('i'), t.identifier('old_size'))]
                    )
                  )
                ),
                // p<applier>(element, items.at(i + old_size));
                t.expressionStatement(
                  t.callExpression(applier(), [
                    t.identifier('element'),
                    t.callExpression(
                      t.memberExpression(t.identifier('items'), t.identifier('at')),
                      [t.binaryExpression('+', t.identifier('i'), t.identifier('old_size'))]
                    )
                  ])
                ),
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('elements'), t.identifier('i'), true),
                    t.identifier('element')
                  )
                ),
                t.expressionStatement(
                  t.callExpression(
                    t.memberExpression(t.identifier('fragment'), t.identifier('appendChild')),
                    [t.identifier('element')]
                  )
                )
              ])
            ),
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(elements(), t.identifier('push')),
                [t.spreadElement(t.identifier('elements'))]
              )
            ),
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(t.identifier('target'), t.identifier('appendChild')),
                [t.identifier('fragment')]
              )
            )
          ])
        ),

        // for (const [i, j] of swaps.entries()) { ... }
        t.forOfStatement(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.arrayPattern([t.identifier('i'), t.identifier('j')]))
          ]),
          t.callExpression(t.memberExpression(t.identifier('swaps'), t.identifier('entries')), []),
          t.blockStatement([
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.identifier('target'), t.identifier('insertBefore')), [
                t.memberExpression(elements(), t.identifier('i'), true),
                t.memberExpression(elements(), t.binaryExpression('+', t.identifier('j'), t.numericLiteral(1)), true)
              ])
            ),
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.identifier('target'), t.identifier('insertBefore')), [
                t.memberExpression(elements(), t.identifier('j'), true),
                t.memberExpression(elements(), t.binaryExpression('+', t.identifier('i'), t.numericLiteral(1)), true)
              ])
            ),
            t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier('temporary'), t.memberExpression(elements(), t.identifier('i'), true))
            ]),
            t.expressionStatement(
              t.assignmentExpression('=', t.memberExpression(elements(), t.identifier('i'), true), t.memberExpression(elements(), t.identifier('j'), true))
            ),
            t.expressionStatement(
              t.assignmentExpression('=', t.memberExpression(elements(), t.identifier('j'), true), t.identifier('temporary'))
            )
          ])
        ),

        // for (const id of removes) { ... }
        t.forOfStatement(
          t.variableDeclaration('const', [t.variableDeclarator(t.identifier('id'))]),
          t.identifier('removes'),
          t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier('element'), t.memberExpression(elements(), t.identifier('id'), true))
            ]),
            t.expressionStatement(
              t.assignmentExpression('=', t.memberExpression(t.identifier('element'), t.identifier(SF_HANDLERS)), t.identifier('undefined'))
            ),
            t.expressionStatement(
              t.callExpression(t.memberExpression(t.identifier('element'), t.identifier('remove')), [])
            )
          ])
        ),

        // for (const id of updates) { ... }
        t.forOfStatement(
          t.variableDeclaration('const', [t.variableDeclarator(t.identifier('id'))]),
          t.identifier('updates'),
          t.blockStatement([
            t.expressionStatement(
              t.callExpression(applier(), [
                t.memberExpression(elements(), t.identifier('id'), true),
                t.callExpression(t.memberExpression(t.identifier('items'), t.identifier('at')), [t.identifier('id')])
              ])
            )
          ])
        )
      ])
    ]
  },

  // TEXT = 3
  [Codes.TEXT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]
    const handlerIndex = context.payload.add(handler)

    return [
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(textCache(container), t.identifier('data')),
          callWithContext(param(handlerIndex))
        )
      )
    ]
  },

  // EVENT = 4
  [Codes.EVENT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const event = context.strings[bytecode[offset + 3]]
    const handler = context.functions[bytecode[offset + 4]]

    const eventIndex = context.payload.add(event)
    const handlerIndex = context.payload.add(handler)
    const delegatorIndex = context.payload.add(context.delegator)

    return [
      t.blockStatement([
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('element'), nodeCache(container))
        ]),
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(t.identifier('element'), t.identifier(SF_CONTEXT)),
            t.identifier('context')
          )
        ),
        t.ifStatement(
          t.unaryExpression('!', t.memberExpression(t.identifier('element'), t.identifier(SF_LISTENED))),
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier('element'), t.identifier(SF_LISTENED)),
                t.booleanLiteral(true)
              )
            ),
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(param(delegatorIndex), t.identifier('add')),
                [
                  t.identifier('element'),
                  param(eventIndex),
                  param(handlerIndex)
                ]
              )
            )
          ])
        )
      ])
    ]
  },

  // PROPERTY = 5
  [Codes.PROPERTY](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const property = context.strings[bytecode[offset + 3]]
    const handler = context.functions[bytecode[offset + 4]]

    const propertyIndex = context.payload.add(property)
    const handlerIndex = context.payload.add(handler)

    return [
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(nodeCache(container), param(propertyIndex), true),
          callWithContext(param(handlerIndex))
        )
      )
    ]
  },

  // VM = 6
  [Codes.VM](bytecode, offset, context) {
    const anchor = bytecode[offset + 2]
    const select = context.functions[bytecode[offset + 3]]
    const node = context.nodes[bytecode[offset + 4]]

    const selectIndex = context.payload.add(select)
    const nodeIndex = context.payload.add(node)
    const slotIndex = context.payload.add({
      active: undefined as undefined | vm.Compiler,
      cache: new Map<vm.Compiler, any>()
    })

    const slot = () => param(slotIndex)

    return [
      t.blockStatement([
        // const compile = p<select>(context);
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('compile'),
            callWithContext(param(selectIndex))
          )
        ]),
        // if (slot.active !== undefined) slot.active.root.remove();
        t.ifStatement(
          t.binaryExpression(
            '!==',
            t.memberExpression(slot(), t.identifier('active')),
            t.identifier('undefined')
          ),
          t.blockStatement([
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(slot(), t.identifier('active')),
                  t.identifier('root')
                ),
                [t.identifier('remove')]
              )
            )
          ])
        ),
        // let next = slot.cache.get(compile);
        t.variableDeclaration('let', [
          t.variableDeclarator(
            t.identifier('next'),
            t.callExpression(
              t.memberExpression(slot(), t.identifier('cache')),
              [t.identifier('compile')]
            )
          )
        ]),
        // if (next === undefined) { next = compile(p<node>()); slot.cache.set(compile, next); }
        t.ifStatement(
          t.binaryExpression('===', t.identifier('next'), t.identifier('undefined')),
          t.blockStatement([
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.identifier('next'),
                t.callExpression(t.identifier('compile'), [param(nodeIndex)])
              )
            ),
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(slot(), t.identifier('cache')),
                  t.identifier('set')
                ),
                [t.identifier('compile'), t.identifier('next')]
              )
            )
          ])
        ),
        // slot.active = next;
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(slot(), t.identifier('active')),
            t.identifier('next')
          )
        ),
        // if (next !== undefined) { ... }
        t.ifStatement(
          t.binaryExpression('!==', t.identifier('next'), t.identifier('undefined')),
          t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier('anchor'), nodeCache(anchor))
            ]),
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(t.identifier('anchor'), t.identifier('parentNode')),
                  t.identifier('insertBefore')
                ),
                [
                  t.memberExpression(t.identifier('next'), t.identifier('root')),
                  t.identifier('anchor')
                ]
              )
            )
          ])
        ),
        // if (slot.active !== undefined) slot.active.applier(slot.active.root, context);
        t.ifStatement(
          t.binaryExpression(
            '!==',
            t.memberExpression(slot(), t.identifier('active')),
            t.identifier('undefined')
          ),
          t.blockStatement([
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(slot(), t.identifier('active')),
                  t.identifier('applier')
                ),
                [
                  t.memberExpression(
                    t.memberExpression(slot(), t.identifier('active')),
                    t.identifier('root')
                  ),
                  t.identifier('context')
                ]
              )
            )
          ])
        )
      ])
    ]
  }
}