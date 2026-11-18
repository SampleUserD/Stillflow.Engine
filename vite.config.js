import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { existsSync } from 'fs'

const has_built_plugin = existsSync('./dist/vite.es.js')
const plugins = has_built_plugin
  ? [(await import('./dist/vite.es.js')).stillflow_plugin()]
  : []

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    return {
      plugins: [
        dts({
          tsconfigPath: './tsconfig.json'
        })
      ],
      build: {
        minify: false,
        lib: {
          // Точка входа твоей библиотеки
          entry: {
            index: resolve(import.meta.dirname, 'src/index.ts'),
            vite: resolve(import.meta.dirname, 'src/vite.plugin.ts')
          },

          // Имя глобальной переменной (нужно только для UMD/IIFE)
          name: 'Stillflow',

          // Как называть выходные файлы
          fileName: (format, entryName) => `${entryName}.${format}.js`,

          // Форматы: 'es' для современных сборщиков, 'cjs' для Node.js
          formats: ['es', 'cjs']
        },
        rollupOptions: {
          // ВАЖНО: вынеси все зависимости, которые не должны попасть в бандл
          external: ['vite', '@babel/core', 'fs', 'path'],
        }
      }
    }
  }

  return {
    base: '/output/',
    plugins,
    build: {
      minify: false,
      esbuild: {
        loader: 'tsx', // <-- Явно указываем загрузчик для TSX
        include: /src\/.*\.tsx?$/, // Применяем ко всем .ts и .tsx в src
      },
      outDir: 'output'
    }
  }
})
