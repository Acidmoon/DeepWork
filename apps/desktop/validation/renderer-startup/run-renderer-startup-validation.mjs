import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveValidationRendererEntrypoint } from '../renderer-entrypoint.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(__dirname, '..', '..')
const rendererRoot = join(desktopRoot, 'out', 'renderer')
const indexPath = join(rendererRoot, 'index.html')
const maxEntryJsBytes = 390_000
const maxEntryCssBytes = 80_000

function extractAssetPath(html, pattern, label) {
  const match = html.match(pattern)
  if (!match?.[1]) {
    throw new Error(`Could not locate ${label} reference in renderer index.`)
  }

  return join(rendererRoot, match[1].replaceAll('/', '\\'))
}

function readSize(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`Missing ${label}: ${path}`)
  }

  return statSync(path).size
}

function main() {
  resolveValidationRendererEntrypoint()

  const html = readFileSync(indexPath, 'utf8')
  const entryJsPath = extractAssetPath(html, /<script[^>]+src="\.\/(assets\/[^"]+\.js)"/u, 'entry JavaScript')
  const entryCssPath = extractAssetPath(html, /<link[^>]+href="\.\/(assets\/[^"]+\.css)"/u, 'entry stylesheet')
  const entryJsBytes = readSize(entryJsPath, 'entry JavaScript asset')
  const entryCssBytes = readSize(entryCssPath, 'entry stylesheet asset')

  if (entryJsBytes > maxEntryJsBytes || entryCssBytes > maxEntryCssBytes) {
    throw new Error(
      [
        'Renderer startup guardrail failed.',
        `entryJsBytes=${entryJsBytes} (max ${maxEntryJsBytes})`,
        `entryCssBytes=${entryCssBytes} (max ${maxEntryCssBytes})`,
        'Run npm run build -w @ai-workbench/desktop and inspect the renderer entry chunk boundaries.'
      ].join('\n')
    )
  }

  console.log(
    JSON.stringify({
      entryJsPath,
      entryJsBytes,
      entryCssPath,
      entryCssBytes,
      maxEntryJsBytes,
      maxEntryCssBytes
    })
  )
}

main()
