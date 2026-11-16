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

      const result = await transformAsync(code, {
        filename: id,
        plugins: [transformer()],
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