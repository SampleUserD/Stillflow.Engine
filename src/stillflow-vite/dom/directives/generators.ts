import * as t from '@babel/types'
import * as vm from '@/stillflow-vite/babel-vm/index'

import type { Statement, Expression } from '@babel/types'

import { Codes } from '@/stillflow-vite/dom/directives/codes'
import { Context } from '@/stillflow-vite/dom/build-vm/run'
import { Template } from '@/stillflow-vite/dom/build-vm/template'

// Вспомогательные функции для чистоты кода
const param = (i: number): Expression => t.identifier(`p${i}`)
const nodeCache = (i: number): Expression => t.memberExpression(t.identifier('sf_node_cache'), t.numericLiteral(i), true)
const callWithContext = (callee: Expression): Expression => t.callExpression(callee, [t.identifier('context')])
const textCache = (i: number): Expression => t.memberExpression(t.identifier('sf_text_cache'), t.numericLiteral(i), true)

export const generators: Record<number, (bytecode: ArrayLike<number>, offset: number, context: Context) => { body: Statement[], outer: Statement[] }> = {
  // ==========================================
  // IF = 0
  // ==========================================
  [Codes.IF](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]
    const handlerIndex = context.payload.add(handler, vm.Payload.RESOLVE_NODE)

    return {
      outer: [],
      body: [
        t.blockStatement([
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier('element'), nodeCache(container))
          ]),
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('condition'),
              callWithContext(param(handlerIndex.index))
            )
          ]),
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(t.identifier('element'), t.identifier('style.display')),
              t.conditionalExpression(
                t.identifier('condition'),
                t.stringLiteral(''),
                t.stringLiteral('none')
              )
            )
          )
        ])
      ]
    }
  },

  // ==========================================
  // FOR = 2
  // ==========================================
  [Codes.FOR](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const select = context.functions.get(bytecode[offset + 3])
    const template = context.templates.get<Template>(bytecode[offset + 4])

    // pN индексы
    const selectIndex = context.payload.add(select, vm.Payload.RESOLVE_NODE)       // select функция (context) => Flushable
    const templateIndex = context.payload.add(template, value => t.identifier(`vm${context.environment.template_map.get(value)}`))   // vmN (applier)
    const rootIndex = context.payload.add(template.root, value => t.identifier(`root${context.environment.transform_map.get(value)}`))  // rootN (ленивый DOM)
    const elementsIndex = context.payload.add([], () => t.identifier(`elements${context.environment.transform_map.get(template.root)}`))         // elementsN (мемоизированный массив)
    const delegatorIndex = context.payload.add(context.delegator, () => t.identifier('DELEGATOR'))

    // Хелперы для генерации AST
    const elements = () => param(elementsIndex.index) // elementsN()
    const target = () => nodeCache(container)
    const applier = () => param(templateIndex.index)
    const templateRoot = () => param(rootIndex.index) // rootN

    return {
      outer: [],
      body: [
        t.blockStatement([
          // const items = p<select>(context);
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('items'),
              callWithContext(param(selectIndex.index))
            )
          ]),
          // const target = sf_node_cache[container];
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier('target'), target())
          ]),
          // const { replaces, clears, addes, swaps, removes, updates } = items.flush();
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.objectPattern([
                t.objectProperty(t.identifier('replaces'), t.identifier('replaces'), false, true),
                t.objectProperty(t.identifier('clears'), t.identifier('clears'), false, true),
                t.objectProperty(t.identifier('addes'), t.identifier('addes'), false, true),
                t.objectProperty(t.identifier('swaps'), t.identifier('swaps'), false, true),
                t.objectProperty(t.identifier('removes'), t.identifier('removes'), false, true),
                t.objectProperty(t.identifier('updates'), t.identifier('updates'), false, true)
              ]),
              t.callExpression(t.memberExpression(t.identifier('items'), t.identifier('flush')), [])
            )
          ]),

          // target.setAttribute('data-sf-list', p<DELEGATOR>.register_collection(items))
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                t.identifier('target'),
                t.identifier('setAttribute')
              ),
              [
                t.stringLiteral('data-sf-list'),
                t.callExpression(
                  t.memberExpression(
                    param(delegatorIndex.index),
                    t.identifier('register_collection')
                  ),
                  [
                    t.identifier('items')
                  ]
                )
              ]
            )
          ),

          // if (replaces) { ... }
          t.ifStatement(
            t.identifier('replaces'),
            t.blockStatement([
              // const fragment = document.createDocumentFragment()
              // const size = items.size
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('fragment'),
                  t.callExpression(
                    t.memberExpression(
                      t.identifier('document'),
                      t.identifier('createDocumentFragment')
                    ),
                    []
                  )
                ),
                t.variableDeclarator(
                  t.identifier('size'),
                  t.memberExpression(
                    t.identifier('items'),
                    t.identifier('size')
                  )
                )
              ]),
              // for (let index = 0; index < size; index++) { p<elements>[index] = p<template>.cloneNode(true); fragment.appendChild(element) }
              t.forStatement(
                t.variableDeclaration('let', [
                  t.variableDeclarator(t.identifier('index'), t.numericLiteral(0))
                ]),
                t.binaryExpression(
                  '<',
                  t.identifier('index'),
                  t.identifier('size')
                ),
                t.updateExpression('++', t.identifier('index')),
                t.blockStatement([
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier('element'),
                      t.callExpression(
                        t.memberExpression(
                          templateRoot(),
                          t.identifier('cloneNode')
                        ),
                        [
                          t.booleanLiteral(true)
                        ]
                      )
                    )
                  ]),
                  t.expressionStatement(
                    t.assignmentExpression(
                      '=',
                      t.memberExpression(
                        elements(),
                        t.identifier('index'),
                        true
                      ),
                      t.identifier('element')
                    )
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      applier(),
                      [
                        t.identifier('element'),
                        t.callExpression(
                          t.memberExpression(
                            t.identifier('items'),
                            t.identifier('at')
                          ),
                          [
                            t.identifier('index')
                          ]
                        )
                      ]
                    )
                  ),
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('fragment'),
                        t.identifier('appendChild')
                      ),
                      [
                        t.identifier('element')
                      ]
                    )
                  )
                ])
              ),
              // replace_children.call(target, fragment)
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(
                    t.identifier('replace_children'),
                    t.identifier('call')
                  ),
                  [
                    t.identifier('target'),
                    t.identifier('fragment')
                  ]
                )
              ),
              // return
              t.returnStatement()
            ])
          ),

          // if (clears) { ... }
          t.ifStatement(
            t.identifier('clears'),
            t.blockStatement([
              // set_text.call(target, "")
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(
                    t.identifier('set_text'),
                    t.identifier('call')
                  ),
                  [
                    t.identifier('target'),
                    t.stringLiteral(String())
                  ]
                )
              ),
              // p<elements>.length = 0
              t.expressionStatement(
                t.assignmentExpression(
                  '=',
                  t.memberExpression(
                    elements(),
                    t.identifier('length')
                  ),
                  t.numericLiteral(0)
                )
              )
            ])
          ),

          // if (addes > 0) { ... }
          t.ifStatement(
            t.binaryExpression('>', t.identifier('addes'), t.numericLiteral(0)),
            t.blockStatement([
              // const fragment = document.createDocumentFragment();
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('fragment'),
                  t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createDocumentFragment')), [])
                )
              ]),
              // const old_size = elementsN.length;
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier('old_size'),
                  t.memberExpression(elements(), t.identifier('length'))
                )
              ]),
              // for (let i = 0; i < addes; i++) { ... }
              t.forStatement(
                t.variableDeclaration('let', [t.variableDeclarator(t.identifier('i'), t.numericLiteral(0))]),
                t.binaryExpression('<', t.identifier('i'), t.identifier('addes')),
                t.updateExpression('++', t.identifier('i')),
                t.blockStatement([
                  // const element = rootN.cloneNode(true);
                  t.variableDeclaration('const', [
                    t.variableDeclarator(
                      t.identifier('element'),
                      t.callExpression(t.memberExpression(templateRoot(), t.identifier('cloneNode')), [t.booleanLiteral(true)])
                    ),
                    t.variableDeclarator(
                      t.identifier('value'),
                      t.callExpression(
                        t.memberExpression(
                          t.identifier('items'),
                          t.identifier('at')
                        ),
                        [
                          t.binaryExpression(
                            '+',
                            t.identifier('i'),
                            t.identifier('old_size')
                          )
                        ]
                      )
                    )
                  ]),
                  // vmN(element, value);
                  t.expressionStatement(
                    t.callExpression(applier(), [
                      t.identifier('element'),
                      t.identifier('value')
                    ])
                  ),
                  // p<elements>.push(element);
                  t.expressionStatement(
                    t.callExpression(
                      t.memberExpression(
                        elements(),
                        t.identifier('push')
                      ),
                      [
                        t.identifier('element')
                      ]
                    )
                  ),
                  // fragment.appendChild(element);
                  t.expressionStatement(
                    t.callExpression(t.memberExpression(t.identifier('fragment'), t.identifier('appendChild')), [t.identifier('element')])
                  )
                ])
              ),
              // target.appendChild(fragment);
              t.expressionStatement(
                t.callExpression(t.memberExpression(t.identifier('target'), t.identifier('appendChild')), [t.identifier('fragment')])
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
              // target.insertBefore(elementsN()[i], elementsN()[j + 1]);
              t.expressionStatement(
                t.callExpression(t.memberExpression(t.identifier('target'), t.identifier('insertBefore')), [
                  t.memberExpression(elements(), t.identifier('i'), true),
                  t.memberExpression(elements(), t.binaryExpression('+', t.identifier('j'), t.numericLiteral(1)), true)
                ])
              ),
              // target.insertBefore(elementsN()[j], elementsN()[i + 1]);
              t.expressionStatement(
                t.callExpression(t.memberExpression(t.identifier('target'), t.identifier('insertBefore')), [
                  t.memberExpression(elements(), t.identifier('j'), true),
                  t.memberExpression(elements(), t.binaryExpression('+', t.identifier('i'), t.numericLiteral(1)), true)
                ])
              ),
              // const temporary = elementsN()[i];
              t.variableDeclaration('const', [
                t.variableDeclarator(t.identifier('temporary'), t.memberExpression(elements(), t.identifier('i'), true))
              ]),
              // elementsN()[i] = elementsN()[j];
              t.expressionStatement(
                t.assignmentExpression('=', t.memberExpression(elements(), t.identifier('i'), true), t.memberExpression(elements(), t.identifier('j'), true))
              ),
              // elementsN()[j] = temporary;
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
              // const element = elementsN[id];
              t.variableDeclaration('const', [
                t.variableDeclarator(t.identifier('element'), t.memberExpression(elements(), t.identifier('id'), true))
              ]),
              // element.remove();
              t.expressionStatement(
                t.callExpression(t.memberExpression(t.identifier('element'), t.identifier('remove')), [])
              ),

              // elementsN.splice(id, 1)
              t.expressionStatement(
                t.callExpression(
                  t.memberExpression(
                    elements(),
                    t.identifier('splice')
                  ),
                  [
                    t.identifier('id'),
                    t.numericLiteral(1)
                  ]
                )
              )
            ])
          ),
          // for (const id of updates) { ... }
          t.forOfStatement(
            t.variableDeclaration('const', [t.variableDeclarator(t.identifier('id'))]),
            t.identifier('updates'),
            t.blockStatement([
              // vmN(elementsN[id], items.at(id));
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
    }
  },
  // ==========================================
  // TEXT = 3
  // ==========================================
  [Codes.TEXT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions.get<t.ArrowFunctionExpression>(bytecode[offset + 3])
    const id = context.counters.texts++

    return {
      outer: [
        t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(
              t.identifier(`t${id}`),
              handler
            )
          ]
        )
      ],
      body: [
        // set_data.call(sf_text_cache[container], pN(context));
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('set_data'),
              t.identifier('call')
            ),
            [
              t.memberExpression(
                t.identifier('sf_text_cache'),
                t.numericLiteral(container),
                true
              ),
              t.callExpression(
                t.identifier(`t${id}`),
                [
                  t.identifier('context')
                ]
              )
            ]
          )
        )
      ]
    }
  },

  // ==========================================
  // EVENT = 4
  // ==========================================
  [Codes.EVENT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const event = context.strings.get<string>(bytecode[offset + 3])
    const handler = context.functions.get<t.ArrowFunctionExpression>(bytecode[offset + 4])

    const id = context.counters.registrations++

    return {
      outer: [
        t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(
              t.identifier(`r${id}`),
              t.callExpression(
                t.memberExpression(
                  t.identifier('DELEGATOR'),
                  t.identifier('register')
                ),
                [
                  t.stringLiteral(event as string),
                  handler
                ]
              )
            )
          ]
        )
      ],
      body: [
        t.expressionStatement(
          t.callExpression(
            t.memberExpression(
              nodeCache(container),
              t.identifier('setAttribute')
            ),
            [
              t.stringLiteral(`data-sf-${event as string}`),
              t.identifier(`r${id}`)
            ]
          )
        )
      ]
    }
  },

  // ==========================================
  // PROPERTY = 5
  // ==========================================
  [Codes.PROPERTY](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const property = context.strings.get<string>(bytecode[offset + 3])
    const handler = context.functions.get<t.ArrowFunctionExpression>(bytecode[offset + 4])

    const id = context.counters.properties++

    return {
      outer: [
        t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(
              t.identifier(`prop${id}`),
              handler
            )
          ]
        )
      ],
      body: [
        // sf_node_cache[container][pProperty] = pHandler(context);
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(nodeCache(container), t.identifier(property)),
            callWithContext(t.identifier(`prop${id}`))
          )
        )
      ]
    }
  }
}