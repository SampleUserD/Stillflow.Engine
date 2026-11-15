import type { NodePath, PluginObject, PluginPass, Scope } from '@babel/core'
import type { Node, JSXElement } from '@babel/types'
import { types as t } from '@babel/core'
import generate from '@babel/generator'

import { JSXDOM_REGISTRY } from '@/stillflow-adapters/dom/jsx.dom'
import { compile } from '@/stillflow-aot/dom/compile/dom.compile'
import { build } from '@/stillflow-aot/vm/vm.build'
import { Template } from '@/stillflow-aot/dom/dom.template'
import { TransformResult } from '@/stillflow-aot/dom/transform/dom.transform'
import { run_dom_vm } from '@/stillflow-aot/dom/dom.vm'
import { VMGenerated } from '@/stillflow-aot/vm/vm.generated'

// -----------------------------------------------------------------
// Утилиты: JSX AST → AnyDOM
// -----------------------------------------------------------------

/** Достаёт tag из <jsxdom.div> → 'div' */
function getTagName(node: JSXElement): string | null {
  const name = node.openingElement.name
  if (!t.isJSXMemberExpression(name)) return null
  if (!t.isJSXIdentifier(name.object) || name.object.name !== 'jsxdom') return null
  if (!t.isJSXIdentifier(name.property)) return null
  return name.property.name
}

function getAttrKey(attr: t.JSXAttribute): string | null {
  const name = attr.name
  if (t.isJSXIdentifier(name)) return name.name
  if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`
  }
  return null
}

/** JSXAttribute → { props, astProps } */
function extractProps(
  opening: JSXElement['openingElement'],
  stubToAst: WeakMap<object, Node>
): { props: Record<string, any>; astProps: Record<string, Node> } {
  const props: Record<string, any> = {}
  const astProps: Record<string, Node> = {}

  for (const attr of opening.attributes) {
    if (!t.isJSXAttribute(attr)) continue
    const key = getAttrKey(attr)
    if (!key) continue

    const value = attr.value

    if (value == null) {
      props[key] = true
      astProps[key] = t.booleanLiteral(true)
    } else if (t.isStringLiteral(value)) {
      props[key] = value.value
      astProps[key] = t.stringLiteral(value.value)
    } else if (t.isJSXExpressionContainer(value)) {
      // заглушка для compile; AST — для сериализации
      const stub = () => { }
      stubToAst.set(stub, value.expression)
      props[key] = stub
      astProps[key] = value.expression
    }
  }

  return { props, astProps }
}

/** Дети JSX → AnyDOM-совместимый массив */
function extractChildren(
  node: JSXElement,
  stubToAst: WeakMap<object, Node>,
  scope: Scope
): any[] {
  const children: any[] = []

  for (const child of node.children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim()
      if (text) children.push(text)
    } else if (t.isJSXExpressionContainer(child)) {
      const stub = () => { }
      stubToAst.set(stub, child.expression)
      children.push(stub)
    } else if (t.isJSXElement(child)) {
      children.push(buildAnyDOM(child, stubToAst, scope))
    }
  }

  return children
}

/** JSXElement → AnyDOM (рекурсивно) */
function buildAnyDOM(node: any, stubToAst: any, scope: Scope) {
  const inlined = inlineComponentBody(node, scope)

  if (t.isJSXElement(inlined) && inlined !== node) {
    return buildAnyDOM(inlined, stubToAst, scope)
  }

  const tag = getTagName(node)
  const { props, astProps } = extractProps(node.openingElement, stubToAst)
  const children = extractChildren(node, stubToAst, scope)

  console.log('buildAnyDOM tag:', node, 'isFn:', typeof JSXDOM_REGISTRY[tag])

  // Если есть динамические children — строим modifiers.text как AST
  const dynamic = children.filter(c => typeof c === 'function')
  const staticText = children.filter(c => typeof c === 'string').join('')

  const result = JSXDOM_REGISTRY[tag](props, children)

  if (dynamic.length > 0) {
    // строим AST: (c) => staticText + d0(c) + d1(c) + ...
    let expr: t.Expression = t.stringLiteral(staticText)
    for (const d of dynamic) {
      const ast = stubToAst.get(d)!
      expr = t.binaryExpression('+', expr, t.callExpression(ast as any, [t.identifier('context')]))
    }
    result.properties.modifiers.text = t.arrowFunctionExpression(
      [t.identifier('context')],
      expr
    )
  }

  return result
}

function getFunctionBody(fn: t.ArrowFunctionExpression | t.FunctionExpression | t.FunctionDeclaration): Node | null {
  let body: Node = fn.body

  if (t.isBlockStatement(body)) {
    const returnStmt = body.body.find(s => t.isReturnStatement(s)) as t.ReturnStatement | undefined
    if (!returnStmt || !returnStmt.argument) return null
    body = returnStmt.argument
  }

  return body
}


function inlineComponentBody(
  node: Node,
  scope: Scope
): Node {
  if (!t.isJSXElement(node)) return node

  const name = node.openingElement.name

  // jsxdom.div, jsxdom.button и т.д. — не инлайним
  if (t.isJSXMemberExpression(name)) return node

  // <div> (нативный тег) — не инлайним (Stillflow работает только с jsxdom.*,
  // но на всякий случай пропускаем)
  if (!t.isJSXIdentifier(name)) return node

  const componentName = name.name

  // Ищем компонент в области видимости
  const binding = scope.getBinding(componentName)

  console.log('inline:', componentName, 'binding:', !!binding, 'type:', binding?.path.node.type)

  if (!binding) return node

  const init = binding.path.node

  // Поддерживаем только стрелки и function expressions
  if (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init) && !t.isFunctionDeclaration(init)) {
    return node
  }

  const body = getFunctionBody(init)
  if (!body) return node

  // Если тело — JSX, рекурсивно инлайним внутри него
  if (t.isJSXElement(body)) {
    return inlineComponentBody(body, binding.scope)
  }

  return body
}

/**
 * Строит AnyDOM из AST-узла функции () => JSX, с поддержкой компонентов.
 */
export function eachToAnyDOM(
  each: any,
  stubToAst: WeakMap<object, Node>,
  scope: Scope,
  buildAnyDOM: (node: JSXElement, stubToAst: WeakMap<object, Node>, scope: Scope) => any
): any {
  // 1. Если each — заглушка, достаём AST из stubToAst
  const ast = stubToAst.get(each) ?? each

  // 2. Проверяем, что это функция
  if (!t.isArrowFunctionExpression(ast) && !t.isFunctionExpression(ast) && !t.isFunctionDeclaration(ast)) {
    throw new Error('sf:each must be an arrow/function expression')
  }

  // 3. Извлекаем тело
  let body = getFunctionBody(ast)
  if (!body) {
    throw new Error('sf:each must return a JSX element')
  }

  // 4. Если тело — <Item />, инлайним
  if (t.isJSXElement(body)) {
    body = inlineComponentBody(body, scope)
  }

  // 5. Теперь body — <jsxdom.*> (или всё ещё <Item />, если не нашли)
  if (!t.isJSXElement(body)) {
    throw new Error('sf:each must return a JSX element')
  }

  // 6. Строим AnyDOM (с рекурсивным инлайном внутри)
  return buildAnyDOM(body, stubToAst, scope)
}

// -----------------------------------------------------------------
// Сбор Template-графа
// -----------------------------------------------------------------

function collectTemplates(root: Template): Map<Template, number> {
  const index = new Map<Template, number>()
  function walk(template: Template) {
    if (index.has(template)) return
    for (const sub of template.templates) walk(sub)
    index.set(template, index.size)
  }
  walk(root)
  return index
}

function collectTransforms(templates: Map<Template, number>): Map<TransformResult, number> {
  const index = new Map<TransformResult, number>()
  for (const [template] of templates) {
    if (!index.has(template.root)) index.set(template.root, index.size)
  }
  return index
}

function isTransformResult(value: any): value is TransformResult {
  return (
    value != null &&
    typeof value === 'object' &&
    'parameters' in value &&
    'payloads' in value &&
    'body' in value &&
    'return_expression' in value
  )
}

function isTemplate(value: any): value is Template {
  return (
    value != null &&
    typeof value === 'object' &&
    'bytecode' in value &&
    'functions' in value &&
    'root' in value &&
    'templates' in value
  )
}

// -----------------------------------------------------------------
// resolve
// -----------------------------------------------------------------

function createResolve(
  templateIndex: Map<Template, number>,
  transformIndex: Map<TransformResult, number>,
  stubToAst: WeakMap<object, Node>
) {
  return function resolve(value: any): Node {
    if (t.isNode(value)) return value

    const ast = stubToAst.get(value)
    if (ast) return ast

    // DELEGATOR — импорт
    // (сравнение по ссылке; DELEGATOR импортируется в плагин из того же модуля)
    // Для простоты проверяем по имени конструктора
    if (value?.constructor?.name === 'EventDelegator') {
      return t.identifier('DELEGATOR')
    }

    if (isTemplate(value)) {
      const index = templateIndex.get(value)
      if (index === undefined) throw new Error('Template not collected')
      return t.identifier(`vm${index}`)
    }

    if (isTransformResult(value)) {
      const index = transformIndex.get(value)
      if (index === undefined) throw new Error('TransformResult not collected')
      return t.identifier(`root${index}`)
    }

    if (Array.isArray(value)) return t.arrayExpression([])

    if (value != null && typeof value === 'object' && 'active' in value && 'cache' in value) {
      return t.objectExpression([
        t.objectProperty(t.identifier('active'), t.identifier('undefined')),
        t.objectProperty(t.identifier('cache'), t.newExpression(t.identifier('Map'), []))
      ])
    }

    if (typeof value === 'string') return t.stringLiteral(value)
    if (typeof value === 'number') return t.numericLiteral(value)
    if (typeof value === 'boolean') return t.booleanLiteral(value)
    if (value === undefined) return t.identifier('undefined')
    if (value === null) return t.nullLiteral()

    throw new Error(`Cannot resolve value: ${String(value)}`)
  }
}

// -----------------------------------------------------------------
// Генерация модуля
// -----------------------------------------------------------------

function buildModule(root: Template, stubToAst: WeakMap<object, Node>): t.Program {
  const templateIndex = collectTemplates(root)
  const transformIndex = collectTransforms(templateIndex)
  const resolve = createResolve(templateIndex, transformIndex, stubToAst)

  // 1. GeneratedVM для каждого шаблона
  const generated: VMGenerated[] = []

  for (const [template, index] of templateIndex) {
    generated[index] = run_dom_vm(template, resolve)
  }

  const body: t.Statement[] = []

  // 2. Импорты
  body.push(
    t.importDeclaration(
      [t.importSpecifier(t.identifier('DELEGATOR'), t.identifier('DELEGATOR'))],
      t.stringLiteral('@/stillflow-aot/dom/dom.vm')
    ),
    t.importDeclaration(
      [
        t.importSpecifier(t.identifier('SF_CACHE'), t.identifier('SF_CACHE')),
        t.importSpecifier(t.identifier('SF_CACHE_TEXT'), t.identifier('SF_CACHE_TEXT')),
        t.importSpecifier(t.identifier('SF_CONTEXT'), t.identifier('SF_CONTEXT')),
        t.importSpecifier(t.identifier('SF_HANDLERS'), t.identifier('SF_HANDLERS')),
        t.importSpecifier(t.identifier('SF_LISTENED'), t.identifier('SF_LISTENED')),
        t.importSpecifier(t.identifier('SF_ANY'), t.identifier('SF_ANY'))
      ],
      t.stringLiteral('@/stillflow-adapters/dom/dom.symbols')
    )
  )

  // 3. transformN + rootN
  for (const [transform, index] of transformIndex) {
    // const transformN = function(root, p0, p1, ...) { body; return returnExpression }
    body.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(`transform${index}`),
          t.functionExpression(
            null,
            transform.parameters,
            t.blockStatement([...transform.body, t.returnStatement(transform.return_expression)])
          )
        )
      ])
    )

    // const rootN = (() => { let c; return () => c ??= transformN(document.createDocumentFragment(), ...payloads) })()
    body.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(`root${index}`),
          t.callExpression(
            t.arrowFunctionExpression(
              [],
              t.blockStatement([
                t.variableDeclaration('let', [t.variableDeclarator(t.identifier('c'))]),
                t.returnStatement(
                  t.arrowFunctionExpression(
                    [],
                    t.assignmentExpression(
                      '??=',
                      t.identifier('c'),
                      t.callExpression(t.identifier(`transform${index}`), [
                        t.callExpression(
                          t.memberExpression(t.identifier('document'), t.identifier('createDocumentFragment')),
                          []
                        ),
                        ...transform.payloads.map(p => resolve(p)) as t.Expression[]
                      ])
                    )
                  )
                )
              ])
            ),
            []
          )
        )
      ])
    )
  }

  // 4. vmN
  for (let i = 0; i < generated.length; i++) {
    body.push(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(`vm${i}`), build(generated[i]))
      ])
    )
  }

  // 5. export const app = vmN
  const rootIndex = templateIndex.get(root)!

  body.push(
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('app'), t.identifier(`vm${rootIndex}`))
    ]),
    t.variableDeclaration('const', [
      t.variableDeclarator(t.identifier('root'), t.identifier(`root${rootIndex}`))
    ])
  )

  body.push(
    t.returnStatement(
      t.objectExpression([
        t.objectProperty(t.identifier('app'), t.identifier('app')),
        t.objectProperty(t.identifier('root'), t.identifier('root'))
      ])
    )
  )

  return t.program(body)
}

function inlineComponent(path: NodePath<t.JSXElement>) {
  const name = path.node.openingElement.name
  if (!t.isJSXIdentifier(name)) return // jsxdom.div или member expression — не трогаем
  if (name.name === 'jsxdom') return   // это не компонент, а namespace

  const binding = path.scope.getBinding(name.name)
  if (!binding) return // компонент не найден — оставляем как есть

  const init = binding.path.node
  if (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init)) return

  // Извлекаем тело компонента (JSX)
  let body: t.Node = init.body
  if (t.isBlockStatement(body)) {
    const ret = body.body.find(s => t.isReturnStatement(s)) as t.ReturnStatement
    if (!ret) return
    body = ret.argument
  }
  if (!t.isJSXElement(body)) return

  // Заменяем <Item /> на тело Item
  path.replaceWith(body)
}

// -----------------------------------------------------------------
// Плагин
// -----------------------------------------------------------------

export default function StillflowTransformer(): PluginObject<PluginPass> {
  return {
    name: 'stillflow-aot',
    visitor: {
      JSXElement(path) {
        const tag = getTagName(path.node)
        if (!tag) return // не наш тег — пропускаем

        const stubToAst = new WeakMap<object, Node>()

        // 1. JSX → AnyDOM
        const anyDOM = buildAnyDOM(path.node, stubToAst, path.scope)

        // 2. AnyDOM → Template
        const template = compile(anyDOM, (each) => eachToAnyDOM(each, stubToAst, path.scope, buildAnyDOM))

        // 3. Template → Program (модуль)
        const program = buildModule(template, stubToAst)

        // 4. Заменяем JSX на app (импорт модуля)
        // Простейший вариант: вставляем весь сгенерированный модуль инлайн
        // как IIFE, возвращающий app.
        const iife = t.callExpression(
          t.functionExpression(
            null,
            [],
            t.blockStatement([
              ...program.body.filter(s => !t.isImportDeclaration(s))
            ])
          ),
          []
        )

        // Импорты (DELEGATOR, SF_*) нужно поднять наверх файла
        const imports = program.body.filter(s => t.isImportDeclaration(s))
        const programPath = path.findParent(p => p.isProgram())

        if (programPath) {
          (programPath as any).unshiftContainer('body', imports)
        }

        console.log('=== generated ===')
        console.log(generate(program).code)
        console.log('=== iife ===')
        console.log(generate(iife).code)

        path.replaceWith(iife)
      }
    }
  }
}