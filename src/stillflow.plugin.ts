import transformer from './stillflow.transformer.js'

import type { Plugin } from "vite"
import { transformAsync } from "@babel/core"

export function StillflowPlugin(): Plugin {
  return {
    name: 'vite-plugin-stillflow',
    enforce: 'pre',
    async transform(code, id) {
      const supported_id = id.endsWith('.tsx') || id.endsWith('.jsx')

      if (!supported_id) {
        return
      }

      const result = await transformAsync(code, {
        filename: id,
        plugins: [transformer],
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