import { Component } from "@/stillflow-vite/vm-abstract"
import { get_return_argument } from "@/stillflow-vite/vm-jsx-helpers/get-return-argument"
import { types } from "@babel/core"

export function find_component(ast: types.File, name: string, filename: string): Component | null {
  let result: Component | null = null

  types.traverseFast(ast, node => {
    if (result) {
      return
    }

    if (types.isExportDefaultDeclaration(node)) {
      const declaration = node.declaration

      if (types.isFunctionDeclaration(declaration)) {
        const id = declaration.id

        if (id) {
          const argument = get_return_argument(declaration)

          if (types.isJSXElement(argument)) {
            result = {
              node: declaration,
              parameters: declaration.params.filter(types.isIdentifier),
              body: argument,
              filename,
              scope: null
            }
          }
        }
      } else if (types.isArrowFunctionExpression(declaration)) {
        const argument = get_return_argument(declaration)

        if (types.isJSXElement(argument)) {
          result = {
            node: declaration,
            parameters: declaration.params.filter(types.isIdentifier),
            body: argument,
            filename,
            scope: null
          }
        }
      }
    }

    if (types.isExportNamedDeclaration(node)) {
      const declaration = node.declaration

      if (types.isFunctionDeclaration(declaration)) {
        const id = declaration.id

        if (id?.name === name) {
          const argument = get_return_argument(declaration)

          if (types.isJSXElement(argument)) {
            result = {
              node: declaration,
              parameters: declaration.params.filter(types.isIdentifier),
              body: argument,
              filename,
              scope: null
            }
          }
        }
      }

      if (types.isVariableDeclaration(declaration)) {
        declaration.declarations.forEach(declaration => {
          if (result) {
            return
          }

          const id = declaration.id

          if (types.isIdentifier(id)) {
            const id_name = id.name

            if (name === id_name) {
              const init = declaration.init

              if (types.isArrowFunctionExpression(init) || types.isFunctionExpression(init)) {
                const argument = get_return_argument(init)

                if (types.isJSXElement(argument)) {
                  result = {
                    node: init,
                    parameters: init.params.filter(types.isIdentifier),
                    body: argument,
                    filename,
                    scope: null
                  }
                }
              }
            }
          }
        })
      }
    }
  })

  return result
}