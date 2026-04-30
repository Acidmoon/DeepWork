import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const validationRendererUrlEnv = 'AI_WORKBENCH_VALIDATION_RENDERER_URL'

const validationRoot = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(validationRoot, '..')
const repoRoot = resolve(desktopRoot, '..', '..')
const rendererBuildDir = join(desktopRoot, 'out', 'renderer')
const rendererIndexPath = join(rendererBuildDir, 'index.html')
const buildCommand = 'npm run build -w @ai-workbench/desktop'
const staleToleranceMs = 1000

const sourceEntries = [
  join(desktopRoot, 'src', 'renderer'),
  join(repoRoot, 'packages', 'core', 'src'),
  join(desktopRoot, 'electron.vite.config.ts')
]

const sourceExtensions = new Set(['.css', '.html', '.js', '.jsx', '.json', '.ts', '.tsx'])

function formatPath(path) {
  return relative(repoRoot, path).replaceAll('\\', '/')
}

function readStat(path) {
  try {
    return statSync(path)
  } catch {
    return null
  }
}

function newestFileUnder(path) {
  const stat = readStat(path)
  if (!stat) {
    return null
  }

  if (stat.isFile()) {
    if (!sourceExtensions.has(extname(path))) {
      return null
    }

    return {
      path,
      mtimeMs: stat.mtimeMs
    }
  }

  if (!stat.isDirectory()) {
    return null
  }

  let newest = null
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name)
    const candidate = newestFileUnder(child)
    if (candidate && (!newest || candidate.mtimeMs > newest.mtimeMs)) {
      newest = candidate
    }
  }

  return newest
}

function findNewestSourceFile() {
  let newest = null
  for (const entry of sourceEntries) {
    const candidate = newestFileUnder(entry)
    if (candidate && (!newest || candidate.mtimeMs > newest.mtimeMs)) {
      newest = candidate
    }
  }

  return newest
}

function assetReferencesFromHtml(html) {
  return Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gu), match => match[1])
    .filter(reference => !/^(?:https?:)?\/\//iu.test(reference))
    .filter(reference => !reference.startsWith('data:'))
}

function resolveAssetReference(indexPath, reference) {
  const cleanReference = reference.split(/[?#]/u)[0]
  if (!cleanReference) {
    return null
  }

  if (cleanReference.startsWith('/')) {
    return join(rendererBuildDir, cleanReference.slice(1))
  }

  return resolve(dirname(indexPath), cleanReference)
}

function validateRendererHtml(indexPath, { checkStale }) {
  const indexStat = readStat(indexPath)
  if (!indexStat?.isFile()) {
    throw new Error(
      [
        `Missing deterministic renderer validation entrypoint: ${formatPath(indexPath)}`,
        `Run ${buildCommand} from the repository root before browser-driven validation.`
      ].join('\n')
    )
  }

  const html = readFileSync(indexPath, 'utf8')
  const references = assetReferencesFromHtml(html)
  const missingAssets = references
    .map(reference => ({ reference, path: resolveAssetReference(indexPath, reference) }))
    .filter(asset => asset.path && !existsSync(asset.path))

  if (references.length === 0) {
    throw new Error(
      [
        `Renderer validation entrypoint has no script or stylesheet references: ${formatPath(indexPath)}`,
        `Run ${buildCommand} from the repository root to refresh the deterministic renderer build.`
      ].join('\n')
    )
  }

  if (missingAssets.length > 0) {
    const missingList = missingAssets.map(asset => `- ${asset.reference} -> ${formatPath(asset.path)}`).join('\n')
    throw new Error(
      [
        `Renderer validation entrypoint references missing build assets: ${formatPath(indexPath)}`,
        missingList,
        `Run ${buildCommand} from the repository root to refresh the deterministic renderer build.`
      ].join('\n')
    )
  }

  if (checkStale) {
    const newestSource = findNewestSourceFile()
    if (newestSource && newestSource.mtimeMs > indexStat.mtimeMs + staleToleranceMs) {
      throw new Error(
        [
          `Stale deterministic renderer validation entrypoint: ${formatPath(indexPath)}`,
          `Newer renderer prerequisite: ${formatPath(newestSource.path)}`,
          `Run ${buildCommand} from the repository root before browser-driven validation.`
        ].join('\n')
      )
    }
  }
}

function resolveOverride(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(
      `${validationRendererUrlEnv} must be a valid http(s) or file URL. Received: ${value}`
    )
  }

  if (!['file:', 'http:', 'https:'].includes(url.protocol)) {
    throw new Error(
      `${validationRendererUrlEnv} must use http, https, or file protocol. Received: ${url.protocol}`
    )
  }

  if (url.protocol === 'file:') {
    const overridePath = fileURLToPath(url)
    validateRendererHtml(overridePath, { checkStale: false })
  }

  return {
    url: url.href,
    source: 'override',
    overridden: true,
    protocol: url.protocol
  }
}

export function resolveValidationRendererEntrypoint() {
  const override = process.env[validationRendererUrlEnv]?.trim()
  if (override) {
    return resolveOverride(override)
  }

  validateRendererHtml(rendererIndexPath, { checkStale: true })

  return {
    url: pathToFileURL(rendererIndexPath).href,
    source: 'deterministic-build',
    overridden: false,
    protocol: 'file:',
    indexPath: rendererIndexPath
  }
}

export async function assertValidationRendererAvailable(entrypoint) {
  if (entrypoint.protocol === 'file:') {
    return
  }

  try {
    const response = await fetch(entrypoint.url)
    if (!response.ok) {
      throw new Error(`Renderer responded with ${response.status}`)
    }
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    if (entrypoint.overridden) {
      throw new Error(
        [
          `${validationRendererUrlEnv} is set, but the renderer URL is not reachable: ${entrypoint.url}`,
          cause,
          `Fix the override, or unset ${validationRendererUrlEnv} to use ${formatPath(rendererIndexPath)}.`
        ].join('\n')
      )
    }

    throw new Error(`Renderer validation entrypoint is not reachable: ${entrypoint.url}\n${cause}`)
  }
}

function isDirectRun() {
  return process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url : false
}

if (isDirectRun()) {
  try {
    const entrypoint = resolveValidationRendererEntrypoint()
    console.log(`Renderer validation entrypoint: ${entrypoint.url}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
