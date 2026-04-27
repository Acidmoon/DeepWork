import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))
const coreSourceRoot = path.resolve(__dirname, '../../packages/core/src')
const sharedAliases = {
  '@ai-workbench/core': coreSourceRoot
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@ai-workbench/core'] })],
    resolve: {
      alias: sharedAliases
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@ai-workbench/core'] })],
    resolve: {
      alias: sharedAliases
    }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        ...sharedAliases,
        '@renderer': path.resolve(__dirname, './src/renderer/src')
      }
    }
  }
})
