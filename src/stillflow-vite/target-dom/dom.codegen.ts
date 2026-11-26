import { RequiredCodes, StillflowContext } from "@/stillflow-vite/vm-semantics"
import { CodesDOM } from "@/stillflow-vite/target-dom/dom.codes"

import { Chunk, EmitterToolkit } from "@/stillflow-vite/vm-abstract"
import { Emitter } from "@/stillflow-vite/vm-abstract"
import { BytecodeChunk } from "@/stillflow-vite/vm-semantics/vm.bytecode-builder"

import { types } from "@babel/core"

export interface CodegenContext {
  sf: StillflowContext,
  chunks: BytecodeChunk[],
  scopes: Map<number, BytecodeChunk>[]
  deferred: Set<Chunk>[],
  symbols: Set<string>[]
}

function retrieve_expression_from(node: types.Statement): types.Expression {
  if (types.isExpressionStatement(node)) {
    return node.expression
  }

  throw new Error(`Couldn't retrieve expression from ${node.type}`)
}

function emit_create_element(bytecode: ArrayLike<number>, offset: number, context: CodegenContext, toolkit: EmitterToolkit<CodegenContext>): Chunk {
  const id = bytecode[offset + 3]
  const tag = context.sf.get('string', bytecode[offset + 2])
  const appendages = context.chunks[bytecode[offset + 5]]

  const sf_body = [
    types.variableDeclaration(
      'const',
      [
        types.variableDeclarator(
          types.identifier(`__s${id}`),
          types.callExpression(
            types.memberExpression(
              types.identifier('document'),
              types.identifier('createElement')
            ),
            [
              types.stringLiteral(tag)
            ]
          )
        ),
      ]
    )
  ]

  context.deferred[context.deferred.length - 1].add(toolkit.assembler.assemble(appendages.code))

  return {
    module: [],
    body: sf_body
  }
}

function emit_append_element(bytecode: ArrayLike<number>, offset: number, context: CodegenContext): Chunk {
  const parent = bytecode[offset + 2]
  const child = bytecode[offset + 3]

  return {
    module: [],
    body: [
      types.expressionStatement(
        types.callExpression(
          types.memberExpression(
            types.identifier(`__s${parent}`),
            types.identifier('appendChild')
          ),
          [
            types.identifier(`__s${child}`)
          ]
        )
      )
    ]
  }
}

function emit_static_text(bytecode: ArrayLike<number>, offset: number, context: CodegenContext, toolkit: EmitterToolkit<CodegenContext>): Chunk {
  const id = bytecode[offset + 3]
  const text = context.sf.get('string', bytecode[offset + 2])

  context.deferred[context.deferred.length - 1].add({
    module: [],
    body: [
      types.variableDeclaration(
        'const',
        [
          types.variableDeclarator(
            types.identifier(`__s${id}`),
            types.callExpression(
              types.memberExpression(
                types.identifier('document'),
                types.identifier('createTextNode')
              ),
              [
                types.stringLiteral(text)
              ]
            )
          )
        ]
      )
    ]
  })

  return {
    module: [],
    body: []
  }
}

function emit_scope(bytecode: ArrayLike<number>, offset: number, context: CodegenContext, toolkit: EmitterToolkit<CodegenContext>): Chunk {
  const code = context.chunks[bytecode[offset + 2]]

  context.deferred.push(new Set())
  context.scopes.push(new Map())
  context.symbols.push(new Set(context.symbols[context.symbols.length - 1]))

  const result = toolkit.assembler.assemble(code.code)

  context.scopes.pop()
  context.symbols.pop()

  const deferred = context.deferred.pop()

  const module_statements: Chunk['module'] = result.module
  const body_statements: Chunk['body'] = result.body

  for (const defer of deferred) {
    module_statements.push(...defer.module)
    body_statements.push(...defer.body)
  }

  return {
    module: module_statements,
    body: body_statements
  }
}

function emit_identifier(bytecode: ArrayLike<number>, offset: number, context: CodegenContext): Chunk {
  const name = context.sf.get('string', bytecode[offset + 2])

  return {
    module: [],
    body: [
      types.expressionStatement(
        types.identifier(name)
      )
    ]
  }
}

function emit_for(bytecode: ArrayLike<number>, offset: number, context: CodegenContext, toolkit: EmitterToolkit<CodegenContext>): Chunk {
  const body_chunk = context.chunks[bytecode[offset + 2]]
  const select_chunk = context.chunks[bytecode[offset + 3]]
  const last_id = bytecode[offset + 8]

  const id = bytecode[offset + 4]

  context.symbols[context.symbols.length - 1].add(`__t${select_chunk.id}`)
  context.symbols[context.symbols.length - 1].add(`__u${select_chunk.id}`)

  const body = toolkit.assembler.assemble(body_chunk.code)
  const select = toolkit.assembler.assemble(select_chunk.code)

  const is_outermost = bytecode[offset + 5]
  const is_innermost = bytecode[offset + 6]
  const is_inbetween = bytecode[offset + 7]

  const items = retrieve_expression_from(select.body[0])

  const items_at = (index: types.Expression) => {
    return types.callExpression(
      types.memberExpression(
        items,
        types.identifier('at')
      ),
      [index]
    )
  }

  const element_at = (index: types.Expression) => {
    return types.memberExpression(
      sf_elements,
      index,
      true
    )
  }

  const insert_if_exists = <T extends types.Node>(key: string, statements: T[], alt: T[] = []): T[] => {
    return context.symbols[context.symbols.length - 1].has(key) ? statements : alt
  }

  const insert_if_outermost = <T extends types.Node>(statements: T[], alt: T[] = []): T[] => {
    return is_outermost ? statements : alt
  }

  const insert_if_inbetween = <T extends types.Node>(statements: T[], alt: T[] = []): T[] => {
    return is_inbetween ? statements : alt
  }

  const insert_if_innermost = <T extends types.Node>(statements: T[], alt: T[] = []): T[] => {
    return is_innermost ? statements : alt
  }

  const sf_root = types.identifier(`__s${id}`)

  const sf_template = types.identifier('template')

  const sf_delegator = types.identifier('DELEGATOR')

  const sf_elements = types.memberExpression(
    sf_root,
    types.identifier('sf_elements')
  )

  const sf_body = [
    types.variableDeclaration(
      'const',
      [
        types.variableDeclarator(
          types.identifier('__sn'),
          types.callExpression(
            types.identifier(`__t${select_chunk.id + 1}`),
            [
              types.identifier(`__sk`)
            ]
          )
        )
      ]
    ),
  ]

  const sf_updater = types.identifier('applier')

  return {
    module: [],
    body: [
      ...insert_if_inbetween(body.body),
      ...insert_if_innermost(body.body),
      types.variableDeclaration(
        'const',
        [
          types.variableDeclarator(
            types.identifier(`__t${select_chunk.id}`),
            types.functionExpression(
              null,
              [types.identifier('__sk')],
              types.blockStatement([
                ...insert_if_outermost([
                  ...body.body,
                  types.variableDeclaration(
                    'const',
                    [
                      types.variableDeclarator(
                        types.identifier('__sn'),
                        types.identifier(`__s${last_id}`)
                      )
                    ]
                  ),
                  types.returnStatement(
                    types.arrayExpression([
                      types.identifier('__sn'),
                      ...insert_if_exists<types.Expression>(
                        `__u${select_chunk.id + 1}`,
                        [types.identifier(`__u${select_chunk.id + 1}`)],
                        [types.arrowFunctionExpression([], types.blockStatement([]))]
                      )
                    ])
                  )
                ]),
                ...insert_if_inbetween([
                  ...sf_body,
                  types.returnStatement(
                    types.arrayExpression([
                      types.memberExpression(
                        types.identifier('__sn'),
                        types.numericLiteral(0),
                        true
                      ),
                      types.identifier(`__u${select_chunk.id + 1}`)
                    ])
                  )
                ]),
                ...insert_if_innermost([
                  ...sf_body,
                  types.expressionStatement(
                    types.callExpression(
                      types.memberExpression(
                        types.identifier('__sk'),
                        types.identifier('appendChild')
                      ),
                      [
                        types.memberExpression(
                          types.identifier('__sn'),
                          types.numericLiteral(0),
                          true
                        )
                      ]
                    )
                  ),
                  types.returnStatement(
                    types.arrayExpression([
                      types.memberExpression(
                        types.identifier('__sn'),
                        types.numericLiteral(0),
                        true
                      ),
                      types.identifier(`__u${select_chunk.id + 1}`)
                    ])
                  )
                ])
              ])
            )
          )
        ]
      ),
      types.variableDeclaration(
        'const',
        [
          types.variableDeclarator(
            types.identifier(`__u${select_chunk.id}`),
            types.functionExpression(
              null,
              [...insert_if_inbetween([types.identifier(`__s${id}`)]), ...insert_if_outermost([types.identifier(`__s${id}`)]), types.identifier('$it')],
              types.blockStatement([
                types.variableDeclaration(
                  "const",
                  [
                    types.variableDeclarator(
                      types.objectPattern([
                        types.objectProperty(types.identifier("swaps"), types.identifier("swaps"), false, true),
                        types.objectProperty(types.identifier("addes"), types.identifier("addes"), false, true),
                        types.objectProperty(types.identifier("updates"), types.identifier("updates"), false, true),
                        types.objectProperty(types.identifier("removes"), types.identifier("removes"), false, true),
                        types.objectProperty(types.identifier("replaces"), types.identifier("replaces"), false, true),
                        types.objectProperty(types.identifier("clears"), types.identifier("clears"), false, true)
                      ]),
                      types.callExpression(
                        types.memberExpression(
                          items,
                          types.identifier('flush')
                        ),
                        []
                      )
                    ),
                    types.variableDeclarator(
                      types.arrayPattern([
                        sf_template,
                        sf_updater
                      ]),
                      types.callExpression(
                        types.identifier(`__t${select_chunk.id}`),
                        [
                          types.callExpression(
                            types.memberExpression(
                              types.identifier('document'),
                              types.identifier('createDocumentFragment')
                            ),
                            []
                          )
                        ]
                      )
                    )
                  ]
                ),
                types.expressionStatement(
                  types.assignmentExpression(
                    '||=',
                    sf_updater,
                    types.arrowFunctionExpression(
                      [],
                      types.blockStatement([])
                    )
                  )
                ),
                types.ifStatement(
                  types.unaryExpression(
                    '!',
                    sf_elements
                  ),
                  types.blockStatement([
                    types.expressionStatement(
                      types.assignmentExpression(
                        '=',
                        sf_elements,
                        types.arrayExpression([])
                      ),
                    ),
                    types.expressionStatement(
                      types.callExpression(
                        types.memberExpression(
                          sf_root,
                          types.identifier('setAttribute')
                        ),
                        [
                          types.stringLiteral('data-sf-list'),
                          types.callExpression(
                            types.memberExpression(
                              sf_delegator,
                              types.identifier('register_collection')
                            ),
                            [
                              items
                            ]
                          )
                        ]
                      )
                    )
                  ])
                ),
                types.ifStatement(
                  types.identifier('replaces'),
                  types.blockStatement([
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
                          items,
                          types.identifier('size')
                        )
                      ),
                    ]),
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
                                sf_template,
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
                              sf_elements,
                              types.identifier('index'),
                              true
                            ),
                            types.identifier('element')
                          )
                        ),
                        types.expressionStatement(
                          types.callExpression(
                            sf_updater,
                            [
                              types.identifier('element'),
                              items_at(types.identifier('index'))
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
                    types.expressionStatement(
                      types.callExpression(
                        types.memberExpression(
                          sf_root,
                          types.identifier('replaceChildren')
                        ),
                        [
                          types.identifier('fragment')
                        ]
                      )
                    )
                  ])
                ),
                types.ifStatement(
                  types.identifier('clears'),
                  types.blockStatement([
                    types.expressionStatement(
                      types.assignmentExpression(
                        '=',
                        types.memberExpression(
                          sf_root,
                          types.identifier('textContent')
                        ),
                        types.stringLiteral(String())
                      )
                    ),
                    types.expressionStatement(
                      types.assignmentExpression(
                        '=',
                        types.memberExpression(
                          sf_elements,
                          types.identifier('length')
                        ),
                        types.numericLiteral(0)
                      )
                    )
                  ])
                ),
                types.ifStatement(
                  types.binaryExpression('>', types.identifier('addes'), types.numericLiteral(0)),
                  types.blockStatement([
                    // const fragment = documentypes.createDocumentFragment();
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
                      )
                    ]),
                    // const old_size = elementsN.length;
                    types.variableDeclaration('const', [
                      types.variableDeclarator(
                        types.identifier('old_size'),
                        types.memberExpression(sf_elements, types.identifier('length'))
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
                            types.callExpression(types.memberExpression(sf_template, types.identifier('cloneNode')), [types.booleanLiteral(true)])
                          ),
                          types.variableDeclarator(
                            types.identifier('value'),
                            items_at(
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
                          types.callExpression(
                            sf_updater,
                            [
                              types.identifier('element'),
                              types.identifier('value')
                            ]
                          )
                        ),
                        // p<elements>.push(element);
                        types.expressionStatement(
                          types.callExpression(
                            types.memberExpression(
                              sf_elements,
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
                      types.callExpression(types.memberExpression(sf_root, types.identifier('appendChild')), [types.identifier('fragment')])
                    )
                  ])
                ),
                types.forOfStatement(
                  types.variableDeclaration('const', [
                    types.variableDeclarator(types.arrayPattern([types.identifier('i'), types.identifier('j')]))
                  ]),
                  types.callExpression(types.memberExpression(types.identifier('swaps'), types.identifier('entries')), []),
                  types.blockStatement([
                    // targetypes.insertBefore(elementsN()[i], elementsN()[j + 1]);
                    types.expressionStatement(
                      types.callExpression(types.memberExpression(types.identifier('target'), types.identifier('insertBefore')), [
                        types.memberExpression(sf_elements, types.identifier('i'), true),
                        types.memberExpression(sf_elements, types.binaryExpression('+', types.identifier('j'), types.numericLiteral(1)), true)
                      ])
                    ),
                    // targetypes.insertBefore(elementsN()[j], elementsN()[i + 1]);
                    types.expressionStatement(
                      types.callExpression(types.memberExpression(types.identifier('target'), types.identifier('insertBefore')), [
                        types.memberExpression(sf_elements, types.identifier('j'), true),
                        types.memberExpression(sf_elements, types.binaryExpression('+', types.identifier('i'), types.numericLiteral(1)), true)
                      ])
                    ),
                    // const temporary = elementsN()[i];
                    types.variableDeclaration('const', [
                      types.variableDeclarator(types.identifier('temporary'), types.memberExpression(sf_elements, types.identifier('i'), true))
                    ]),
                    // elementsN()[i] = elementsN()[j];
                    types.expressionStatement(
                      types.assignmentExpression('=', types.memberExpression(sf_elements, types.identifier('i'), true), types.memberExpression(sf_elements, types.identifier('j'), true))
                    ),
                    // elementsN()[j] = temporary;
                    types.expressionStatement(
                      types.assignmentExpression('=', types.memberExpression(sf_elements, types.identifier('j'), true), types.identifier('temporary'))
                    )
                  ])
                ),
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
                      types.callExpression(
                        sf_updater,
                        [
                          element_at(types.identifier('id')),
                          types.identifier('item')
                        ]
                      )
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
                          sf_elements,
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
                          sf_elements,
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
                          sf_elements,
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
                                sf_elements,
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
                                  sf_elements,
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
                          sf_elements,
                          types.identifier('length')
                        ),
                        types.identifier('write')
                      )
                    )
                  ])
                )
              ])
            )
          )
        ]
      )
    ]
  }
}

export const emitters: Record<number, Emitter<CodegenContext>> = {
  [CodesDOM.CREATE_ELEMENT]: emit_create_element,
  [CodesDOM.APPEND]: emit_append_element,
  [CodesDOM.SET_STATIC_TEXT]: emit_static_text,
  [RequiredCodes.SCOPE]: emit_scope,
  [RequiredCodes.FOR]: emit_for,
  [RequiredCodes.READ_ID]: emit_identifier
}