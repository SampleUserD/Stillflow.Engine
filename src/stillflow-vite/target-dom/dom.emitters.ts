import { types } from '@babel/core'

import { CodesDOM } from '@/stillflow-vite/target-dom/dom.codes'
import { Emitter } from '@/stillflow-vite/vm-abstract'
import { CompilerResult } from '@/stillflow-vite/target-dom/dom.compiler'

// Вспомогательные функции для чистоты кода
const param = (i: number): types.Expression => types.identifier(`p${i}`)
const nodeCache = (i: number): types.Expression => types.memberExpression(types.identifier('sf_node_cache'), types.numericLiteral(i), true)
const callWithContext = (callee: types.Expression): types.Expression => types.callExpression(callee, [types.identifier('context')])

export const emitters: Record<number, Emitter> = {
  // ==========================================
  // IF = 0
  // ==========================================
  [CodesDOM.IF](bytecode, offset, toolkit, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]

    const counter = toolkit.counters.create('sf_if')
    const id = counter.identifier()

    return {
      module: [
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              id,
              handler
            ),
          ]
        )
      ],
      body: [
        types.blockStatement([
          types.variableDeclaration('const', [
            types.variableDeclarator(types.identifier('element'), nodeCache(container))
          ]),
          types.variableDeclaration('const', [
            types.variableDeclarator(
              types.identifier('condition'),
              callWithContext(id)
            )
          ]),
          types.expressionStatement(
            types.assignmentExpression(
              '=',
              types.memberExpression(
                types.memberExpression(
                  types.identifier('element'),
                  types.identifier('style')
                ),
                types.identifier('display')
              ),
              types.conditionalExpression(
                types.identifier('condition'),
                types.stringLiteral(''),
                types.stringLiteral('none')
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
  [CodesDOM.FOR](bytecode, offset, toolkit, context) {
    const result = context as CompilerResult

    const container = bytecode[offset + 2]
    const select = result.functions[bytecode[offset + 3]] as types.ArrowFunctionExpression
    const template = result.templates[bytecode[offset + 4]]
    const node = result.nodes[bytecode[offset + 5]]

    let applier: () => types.Expression

    if (node.properties.recursive !== result.node) {
      applier = () => types.identifier(`vm_${context.compile_map.get(template)}`)
    } else {
      applier = () => types.identifier(`vm_${context.compile_map.get(context)}`)
    }

    const templateRoot = types.identifier('ROOT')
    const delegator = types.identifier('DELEGATOR')

    // Хелперы для генерации AST
    const elements = () => types.memberExpression(
      types.identifier('ROOT'),
      types.identifier('sf_elements')
    )
    const target = () => nodeCache(container)
    const at = (index: types.Expression) => {
      return types.callExpression(
        types.memberExpression(
          types.identifier('items'),
          types.identifier('at')
        ),
        [index]
      )
    }
    const element_at = (index: types.Expression) => {
      return types.memberExpression(
        elements(),
        index,
        true
      )
    }

    const select_counter = toolkit.counters.create('sf_select')
    const select_id = select_counter.identifier()

    return {
      module: [
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              select_id,
              select
            ),
          ]
        ),
      ],
      body: [
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              types.identifier('ROOT'),
              node.properties.recursive === result.node ?
                types.callExpression(types.identifier(`transform_${context.transform_map.get(template.root)}`), [types.identifier('root')]) :
                types.identifier(`root_${context.transform_map.get(template.root)}`)
            )
          ]
        ),
        types.blockStatement([
          // const items = p<select>(context);
          types.variableDeclaration('const', [
            types.variableDeclarator(
              types.identifier('items'),
              callWithContext(select_id)
            )
          ]),
          // const target = sf_node_cache[container];
          types.variableDeclaration('const', [
            types.variableDeclarator(types.identifier('target'), target())
          ]),
          // const { replaces, clears, addes, swaps, removes, updates } = items.flush();
          types.variableDeclaration('const', [
            types.variableDeclarator(
              types.objectPattern([
                types.objectProperty(types.identifier('replaces'), types.identifier('replaces'), false, true),
                types.objectProperty(types.identifier('clears'), types.identifier('clears'), false, true),
                types.objectProperty(types.identifier('addes'), types.identifier('addes'), false, true),
                types.objectProperty(types.identifier('swaps'), types.identifier('swaps'), false, true),
                types.objectProperty(types.identifier('removes'), types.identifier('removes'), false, true),
                types.objectProperty(types.identifier('updates'), types.identifier('updates'), false, true)
              ]),
              types.callExpression(types.memberExpression(types.identifier('items'), types.identifier('flush')), [])
            )
          ]),

          // targetypes.setAttribute('data-sf-list', p<DELEGATOR>.register_collection(items))
          types.ifStatement(
            types.unaryExpression(
              '!',
              types.memberExpression(
                types.identifier('ROOT'),
                types.identifier('sf_elements')
              )
            ),
            types.blockStatement([
              types.expressionStatement(
                types.assignmentExpression(
                  '=',
                  types.memberExpression(
                    types.identifier('ROOT'),
                    types.identifier('sf_elements')
                  ),
                  types.arrayExpression([])
                )
              ),
              types.expressionStatement(
                types.callExpression(
                  types.memberExpression(
                    types.identifier('target'),
                    types.identifier('setAttribute')
                  ),
                  [
                    types.stringLiteral('data-sf-list'),
                    types.callExpression(
                      types.memberExpression(
                        delegator,
                        types.identifier('register_collection')
                      ),
                      [
                        types.identifier('items')
                      ]
                    )
                  ]
                )
              ),
            ])
          ),

          // if (replaces) { ... }
          types.ifStatement(
            types.identifier('replaces'),
            types.blockStatement([
              // const fragment = documentypes.createDocumentFragment()
              // const size = items.size
              types.variableDeclaration('const', [
                types.variableDeclarator(
                  types.identifier('fragment'),
                  types.callExpression(
                    types.memberExpression(
                      types.identifier('document'),
                      types.identifier('createDocumentFragment')
                    ),
                    []
                  )
                ),
                types.variableDeclarator(
                  types.identifier('size'),
                  types.memberExpression(
                    types.identifier('items'),
                    types.identifier('size')
                  )
                )
              ]),
              // for (let index = 0; index < size; index++) { p<elements>[index] = p<template>.cloneNode(true); fragmentypes.appendChild(element) }
              types.forStatement(
                types.variableDeclaration('let', [
                  types.variableDeclarator(types.identifier('index'), types.numericLiteral(0))
                ]),
                types.binaryExpression(
                  '<',
                  types.identifier('index'),
                  types.identifier('size')
                ),
                types.updateExpression('++', types.identifier('index')),
                types.blockStatement([
                  types.variableDeclaration('const', [
                    types.variableDeclarator(
                      types.identifier('element'),
                      types.callExpression(
                        types.memberExpression(
                          templateRoot,
                          types.identifier('cloneNode')
                        ),
                        [
                          types.booleanLiteral(true)
                        ]
                      )
                    )
                  ]),
                  types.expressionStatement(
                    types.assignmentExpression(
                      '=',
                      types.memberExpression(
                        elements(),
                        types.identifier('index'),
                        true
                      ),
                      types.identifier('element')
                    )
                  ),
                  types.expressionStatement(
                    types.callExpression(
                      applier(),
                      [
                        types.identifier('element'),
                        at(types.identifier('index'))
                      ]
                    )
                  ),
                  types.expressionStatement(
                    types.callExpression(
                      types.memberExpression(
                        types.identifier('fragment'),
                        types.identifier('appendChild')
                      ),
                      [
                        types.identifier('element')
                      ]
                    )
                  )
                ])
              ),
              // replace_children.call(target, fragment)
              types.expressionStatement(
                types.callExpression(
                  types.memberExpression(
                    types.identifier('replace_children'),
                    types.identifier('call')
                  ),
                  [
                    types.identifier('target'),
                    types.identifier('fragment')
                  ]
                )
              ),
            ]),
          ),
          // if (clears) { ... }
          types.ifStatement(
            types.identifier('clears'),
            types.blockStatement([
              // set_textypes.call(target, "")
              types.expressionStatement(
                types.callExpression(
                  types.memberExpression(
                    types.identifier('set_text'),
                    types.identifier('call')
                  ),
                  [
                    types.identifier('target'),
                    types.stringLiteral(String())
                  ]
                )
              ),
              // p<elements>.length = 0
              types.expressionStatement(
                types.assignmentExpression(
                  '=',
                  types.memberExpression(
                    elements(),
                    types.identifier('length')
                  ),
                  types.numericLiteral(0)
                )
              )
            ])
          ),

          // if (addes > 0) { ... }
          types.ifStatement(
            types.binaryExpression('>', types.identifier('addes'), types.numericLiteral(0)),
            types.blockStatement([
              // const fragment = documentypes.createDocumentFragment();
              types.variableDeclaration('const', [
                types.variableDeclarator(
                  types.identifier('fragment'),
                  types.callExpression(types.memberExpression(types.identifier('document'), types.identifier('createDocumentFragment')), [])
                )
              ]),
              // const old_size = elementsN.length;
              types.variableDeclaration('const', [
                types.variableDeclarator(
                  types.identifier('old_size'),
                  types.memberExpression(elements(), types.identifier('length'))
                )
              ]),
              // for (let i = 0; i < addes; i++) { ... }
              types.forStatement(
                types.variableDeclaration('let', [types.variableDeclarator(types.identifier('i'), types.numericLiteral(0))]),
                types.binaryExpression('<', types.identifier('i'), types.identifier('addes')),
                types.updateExpression('++', types.identifier('i')),
                types.blockStatement([
                  // const element = rootN.cloneNode(true);
                  types.variableDeclaration('const', [
                    types.variableDeclarator(
                      types.identifier('element'),
                      types.callExpression(types.memberExpression(templateRoot, types.identifier('cloneNode')), [types.booleanLiteral(true)])
                    ),
                    types.variableDeclarator(
                      types.identifier('value'),
                      at(
                        types.binaryExpression(
                          '+',
                          types.identifier('i'),
                          types.identifier('old_size')
                        )
                      )
                    )
                  ]),
                  // vmN(element, value);
                  types.expressionStatement(
                    types.callExpression(applier(), [
                      types.identifier('element'),
                      types.identifier('value')
                    ])
                  ),
                  // p<elements>.push(element);
                  types.expressionStatement(
                    types.callExpression(
                      types.memberExpression(
                        elements(),
                        types.identifier('push')
                      ),
                      [
                        types.identifier('element')
                      ]
                    )
                  ),
                  // fragmentypes.appendChild(element);
                  types.expressionStatement(
                    types.callExpression(types.memberExpression(types.identifier('fragment'), types.identifier('appendChild')), [types.identifier('element')])
                  )
                ])
              ),
              // targetypes.appendChild(fragment);
              types.expressionStatement(
                types.callExpression(types.memberExpression(types.identifier('target'), types.identifier('appendChild')), [types.identifier('fragment')])
              )
            ])
          ),
          // for (const [i, j] of swaps.entries()) { ... }
          types.forOfStatement(
            types.variableDeclaration('const', [
              types.variableDeclarator(types.arrayPattern([types.identifier('i'), types.identifier('j')]))
            ]),
            types.callExpression(types.memberExpression(types.identifier('swaps'), types.identifier('entries')), []),
            types.blockStatement([
              // targetypes.insertBefore(elementsN()[i], elementsN()[j + 1]);
              types.expressionStatement(
                types.callExpression(types.memberExpression(types.identifier('target'), types.identifier('insertBefore')), [
                  types.memberExpression(elements(), types.identifier('i'), true),
                  types.memberExpression(elements(), types.binaryExpression('+', types.identifier('j'), types.numericLiteral(1)), true)
                ])
              ),
              // targetypes.insertBefore(elementsN()[j], elementsN()[i + 1]);
              types.expressionStatement(
                types.callExpression(types.memberExpression(types.identifier('target'), types.identifier('insertBefore')), [
                  types.memberExpression(elements(), types.identifier('j'), true),
                  types.memberExpression(elements(), types.binaryExpression('+', types.identifier('i'), types.numericLiteral(1)), true)
                ])
              ),
              // const temporary = elementsN()[i];
              types.variableDeclaration('const', [
                types.variableDeclarator(types.identifier('temporary'), types.memberExpression(elements(), types.identifier('i'), true))
              ]),
              // elementsN()[i] = elementsN()[j];
              types.expressionStatement(
                types.assignmentExpression('=', types.memberExpression(elements(), types.identifier('i'), true), types.memberExpression(elements(), types.identifier('j'), true))
              ),
              // elementsN()[j] = temporary;
              types.expressionStatement(
                types.assignmentExpression('=', types.memberExpression(elements(), types.identifier('j'), true), types.identifier('temporary'))
              )
            ])
          ),

          // for (const [id, item] of updates) { ... }
          types.forOfStatement(
            types.variableDeclaration('const', [
              types.variableDeclarator(
                types.arrayPattern([
                  types.identifier('id'),
                  types.identifier('item')
                ])
              )
            ]),
            types.callExpression(
              types.memberExpression(
                types.identifier('updates'),
                types.identifier('entries')
              ),
              []
            ),
            types.blockStatement([
              // vmN(elementsN[id], items.at(pid));
              types.expressionStatement(
                types.callExpression(applier(), [
                  element_at(types.identifier('id')),
                  types.identifier('item')
                ])
              )
            ])
          ),
          // for (const id of removes) { ... }
          types.forOfStatement(
            types.variableDeclaration('const', [types.variableDeclarator(types.identifier('id'))]),
            types.identifier('removes'),
            types.blockStatement([
              // const element = elementsN[id];
              types.variableDeclaration('const', [
                types.variableDeclarator(
                  types.identifier('element'),
                  types.memberExpression(
                    elements(),
                    types.identifier('id'),
                    true
                  )
                )
              ]),
              // elementypes.remove();
              types.expressionStatement(
                types.callExpression(types.memberExpression(types.identifier('element'), types.identifier('remove')), [])
              ),

              // elementsN[id] = null
              types.expressionStatement(
                types.assignmentExpression(
                  '=',
                  types.memberExpression(
                    elements(),
                    types.identifier('id'),
                    true
                  ),
                  types.nullLiteral()
                )
              )
            ])
          ),
          // CLearing removes
          types.ifStatement(
            types.binaryExpression(
              '>',
              types.memberExpression(
                types.identifier('removes'),
                types.identifier('size')
              ),
              types.numericLiteral(0)
            ),
            types.blockStatement([
              types.variableDeclaration(
                'let',
                [
                  types.variableDeclarator(types.identifier('write'), types.numericLiteral(0))
                ]
              ),
              types.forStatement(
                types.variableDeclaration(
                  'let',
                  [
                    types.variableDeclarator(
                      types.identifier('read'),
                      types.numericLiteral(0)
                    )
                  ]
                ),
                types.binaryExpression(
                  '<',
                  types.identifier('read'),
                  types.memberExpression(
                    elements(),
                    types.identifier('length')
                  )
                ),
                types.updateExpression(
                  '++',
                  types.identifier('read')
                ),
                types.blockStatement([
                  types.variableDeclaration(
                    'const',
                    [
                      types.variableDeclarator(
                        types.identifier('element'),
                        types.memberExpression(
                          elements(),
                          types.identifier('read'),
                          true
                        )
                      )
                    ]
                  ),
                  types.ifStatement(
                    types.binaryExpression(
                      '!==',
                      types.identifier('element'),
                      types.nullLiteral()
                    ),
                    types.blockStatement([
                      types.expressionStatement(
                        types.assignmentExpression(
                          '=',
                          types.memberExpression(
                            elements(),
                            types.updateExpression(
                              '++',
                              types.identifier('write')
                            ),
                            true
                          ),
                          types.identifier('element')
                        )
                      )
                    ])
                  )
                ])
              ),
              types.expressionStatement(
                types.assignmentExpression(
                  '=',
                  types.memberExpression(
                    elements(),
                    types.identifier('length')
                  ),
                  types.identifier('write')
                )
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
  [CodesDOM.TEXT](bytecode, offset, toolkit, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]] as types.ArrowFunctionExpression
    const counter = toolkit.counters.create('sf_text')
    const id = counter.identifier()

    return {
      module: [
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              id,
              handler
            )
          ]
        )
      ],
      body: [
        // set_data.call(sf_text_cache[container], pN(context));
        types.expressionStatement(
          types.callExpression(
            types.memberExpression(
              types.identifier('set_data'),
              types.identifier('call')
            ),
            [
              types.memberExpression(
                types.identifier('sf_text_cache'),
                types.numericLiteral(container),
                true
              ),
              types.callExpression(
                id,
                [
                  types.identifier('context')
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
  [CodesDOM.EVENT](bytecode, offset, toolkit, context) {
    const container = bytecode[offset + 2]
    const event = context.strings[bytecode[offset + 3]]
    const handler = context.functions[bytecode[offset + 4]] as types.ArrowFunctionExpression

    const event_counter = toolkit.counters.create('sf_events')
    const event_id = event_counter.identifier()

    return {
      module: [
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              event_id,
              types.callExpression(
                types.memberExpression(
                  types.identifier('DELEGATOR'),
                  types.identifier('register')
                ),
                [
                  types.stringLiteral(event as string),
                  handler
                ]
              )
            )
          ]
        )
      ],
      body: [
        types.expressionStatement(
          types.callExpression(
            types.memberExpression(
              nodeCache(container),
              types.identifier('setAttribute')
            ),
            [
              types.stringLiteral(`data-sf-${event}`),
              event_id
            ]
          )
        )
      ]
    }
  },

  // ==========================================
  // PROPERTY = 5
  // ==========================================
  [CodesDOM.PROPERTY](bytecode, offset, toolkit, context) {
    const container = bytecode[offset + 2]
    const property = context.strings[bytecode[offset + 3]]
    const handler = context.functions[bytecode[offset + 4]] as types.ArrowFunctionExpression

    const property_counter = toolkit.counters.create('sf_property')
    const property_id = property_counter.identifier()

    return {
      module: [
        types.variableDeclaration(
          'const',
          [
            types.variableDeclarator(
              property_id,
              handler
            )
          ]
        )
      ],
      body: [
        // sf_node_cache[container][pProperty] = pHandler(context);
        types.expressionStatement(
          types.assignmentExpression(
            '=',
            types.memberExpression(nodeCache(container), types.identifier(property)),
            callWithContext(property_id)
          )
        )
      ]
    }
  }
}