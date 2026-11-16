import * as t from '@babel/types'
import * as vm from '@/stillflow-vite/babel-vm/index'

import type { Statement, Expression } from '@babel/types'

import { Codes } from '@/stillflow-vite/dom/directives/codes'
import { Context } from '@/stillflow-vite/dom/build-vm/run'
import { SF_CONTEXT, SF_HANDLERS, SF_LISTENED } from '@/stillflow-runtime/utilities/symbols'
import { Template } from '@/stillflow-vite/dom/build-vm/template'

// Вспомогательные функции для чистоты кода
const param = (i: number): Expression => t.identifier(`p${i}`)
const nodeCache = (i: number): Expression => t.memberExpression(t.identifier('sf_node_cache'), t.numericLiteral(i), true)
const callWithContext = (callee: Expression): Expression => t.callExpression(callee, [t.identifier('context')])
const textCache = (i: number): Expression => t.memberExpression(t.identifier('sf_text_cache'), t.numericLiteral(i), true)

export const generators: Record<number, (bytecode: ArrayLike<number>, offset: number, context: Context) => Statement[]> = {
  // ==========================================
  // IF = 0
  // ==========================================
  [Codes.IF](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions[bytecode[offset + 3]]
    const handlerIndex = context.payload.add(handler, vm.Payload.RESOLVE_NODE)

    return [
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

    // Хелперы для генерации AST
    const elements = () => param(elementsIndex.index) // elementsN()
    const target = () => nodeCache(container)
    const applier = () => param(templateIndex.index)
    const templateRoot = () => param(rootIndex.index) // rootN

    return [
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
            // const freelist = elementsN().splice(0);
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('freelist'),
                t.callExpression(t.memberExpression(elements(), t.identifier('splice')), [t.numericLiteral(0)])
              )
            ]),
            // for (const element of freelist) { element[SF_HANDLERS] = undefined; }
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
            // target.textContent = "";
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
            // const fragment = document.createDocumentFragment();
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('fragment'),
                t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('createDocumentFragment')), [])
              )
            ]),
            // const elements = new Array(addes);
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('elements'),
                t.newExpression(t.identifier('Array'), [t.identifier('addes')])
              )
            ]),
            // const old_size = elementsN().length;
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
                // const element = rootN().cloneNode(true);
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier('element'),
                    t.callExpression(t.memberExpression(templateRoot(), t.identifier('cloneNode')), [t.booleanLiteral(true)])
                  )
                ]),
                // element[SF_HANDLERS] = rootN()[SF_HANDLERS];
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
                    t.callExpression(t.memberExpression(t.identifier('items'), t.identifier('at')), [
                      t.binaryExpression('+', t.identifier('i'), t.identifier('old_size'))
                    ])
                  )
                ),
                // vmN(element, items.at(i + old_size));
                t.expressionStatement(
                  t.callExpression(applier(), [
                    t.identifier('element'),
                    t.callExpression(t.memberExpression(t.identifier('items'), t.identifier('at')), [
                      t.binaryExpression('+', t.identifier('i'), t.identifier('old_size'))
                    ])
                  ])
                ),
                // elements[i] = element;
                t.expressionStatement(
                  t.assignmentExpression(
                    '=',
                    t.memberExpression(t.identifier('elements'), t.identifier('i'), true),
                    t.identifier('element')
                  )
                ),
                // fragment.appendChild(element);
                t.expressionStatement(
                  t.callExpression(t.memberExpression(t.identifier('fragment'), t.identifier('appendChild')), [t.identifier('element')])
                )
              ])
            ),
            // elementsN().push(...elements);
            t.expressionStatement(
              t.callExpression(t.memberExpression(elements(), t.identifier('push')), [t.spreadElement(t.identifier('elements'))])
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
            // const element = elementsN()[id];
            t.variableDeclaration('const', [
              t.variableDeclarator(t.identifier('element'), t.memberExpression(elements(), t.identifier('id'), true))
            ]),
            // element[SF_HANDLERS] = undefined;
            t.expressionStatement(
              t.assignmentExpression('=', t.memberExpression(t.identifier('element'), t.identifier(SF_HANDLERS)), t.identifier('undefined'))
            ),
            // element.remove();
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
            // vmN(elementsN()[id], items.at(id));
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
  // ==========================================
  // TEXT = 3
  // ==========================================
  [Codes.TEXT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const handler = context.functions.get(bytecode[offset + 3])

    // Добавляем обработчик в payload (он вернет индекс pN)
    const handlerIndex = context.payload.add(handler, vm.Payload.RESOLVE_NODE)

    return [
      // sf_text_cache[container].data = pN(context);
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(textCache(container), t.identifier('data')),
          callWithContext(param(handlerIndex.index))
        )
      )
    ]
  },

  // ==========================================
  // EVENT = 4
  // ==========================================
  [Codes.EVENT](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const event = context.strings.get(bytecode[offset + 3])
    const handler = context.functions.get(bytecode[offset + 4])

    // Добавляем в payload: саму строку события, обработчик и делегатор
    const eventIndex = context.payload.add(event, vm.Payload.RESOLVE_STRING)
    const handlerIndex = context.payload.add(handler, vm.Payload.RESOLVE_NODE)
    const delegatorIndex = context.payload.add(context.delegator, () => t.identifier('DELEGATOR'))

    return [
      t.blockStatement([
        // const element = sf_node_cache[container];
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('element'), nodeCache(container))
        ]),

        // element[SF_CONTEXT] = context;
        t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(t.identifier('element'), t.identifier(SF_CONTEXT)),
            t.identifier('context')
          )
        ),

        // if (!element[SF_LISTENED]) { ... }
        t.ifStatement(
          t.unaryExpression('!', t.memberExpression(t.identifier('element'), t.identifier(SF_LISTENED))),
          t.blockStatement([
            // element[SF_LISTENED] = true;
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier('element'), t.identifier(SF_LISTENED)),
                t.booleanLiteral(true)
              )
            ),

            // pDelegator.add(element, pEvent, pHandler);
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(param(delegatorIndex.index), t.identifier('add')),
                [
                  t.identifier('element'),
                  param(eventIndex.index),
                  param(handlerIndex.index)
                ]
              )
            )
          ])
        )
      ])
    ]
  },

  // ==========================================
  // PROPERTY = 5
  // ==========================================
  [Codes.PROPERTY](bytecode, offset, context) {
    const container = bytecode[offset + 2]
    const property = context.strings.get(bytecode[offset + 3])
    const handler = context.functions.get(bytecode[offset + 4])

    // Добавляем имя свойства и обработчик
    const propertyIndex = context.payload.add(property, vm.Payload.RESOLVE_STRING)
    const handlerIndex = context.payload.add(handler, vm.Payload.RESOLVE_NODE)

    return [
      // sf_node_cache[container][pProperty] = pHandler(context);
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(nodeCache(container), param(propertyIndex.index), true),
          callWithContext(param(handlerIndex.index))
        )
      )
    ]
  }
}