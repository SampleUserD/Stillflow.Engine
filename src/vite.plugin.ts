import transformer from './stillflow-vite/dom.plugin'

import type { Plugin } from "vite"
import { transformAsync } from "@babel/core"

export function stillflow_plugin(): Plugin {
  return {
    name: 'vite-plugin-stillflow',
    enforce: 'pre',
    async transform(code, id) {
      const supported_id = id.endsWith('.tsx') || id.endsWith('.jsx')

      if (!supported_id) {
        return
      }

      const node_module = await new Function("return import('node:module')")()
      const parser = await import('@babel/parser')
      const babel = await import('@babel/core')
      const path = await new Function("return import('node:path')")()
      const fs = await new Function("return import('node:fs')")()

      const result = await transformAsync(code, {
        filename: id,
        plugins: [transformer({ node_module, babel, parser, path, fs })],
        parserOpts: {
          plugins: ['jsx', 'typescript']
        },
        babelrc: false,
        configFile: false
      })

      return {
        code: result?.code ?? code,
        map: result?.map as any
      }
    }
  }
}