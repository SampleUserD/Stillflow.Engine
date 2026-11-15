import { defineConfig } from 'vite'
import { StillflowPlugin } from './dist/stillflow.plugin.js'

export default defineConfig({
  build: {
    outDir: 'output',
    emptyOutDir: true
  },
  base: './',
  plugins: [StillflowPlugin()],
})
