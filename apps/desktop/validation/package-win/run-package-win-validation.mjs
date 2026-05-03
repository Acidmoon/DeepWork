import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(__dirname, '..', '..')
const repoRoot = resolve(desktopRoot, '..', '..')
const packageRoot = join(repoRoot, 'release', 'windows-alpha')
const unpackedDir = join(packageRoot, 'win-unpacked')
const executablePath = join(unpackedDir, 'DeepWork.exe')
const resourcesPath = join(unpackedDir, 'resources')
const appAsarPath = join(resourcesPath, 'app.asar')
const smokeRoot = join(__dirname, '.smoke-package-win')
const smokeUserDataDir = join(smokeRoot, 'user-data')
const smokeDocumentsDir = join(smokeRoot, 'documents')
const smokeResultPath = join(smokeRoot, 'result.json')
const workspaceDirectories = ['artifacts', 'outputs', 'manifests', 'rules', 'logs']

function ensureInside(parent, target) {
  const relativePath = relative(parent, target)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Refusing to touch path outside validation directory: ${target}`)
  }
}

function resetSmokeDirectory() {
  ensureInside(__dirname, smokeRoot)
  rmSync(smokeRoot, { recursive: true, force: true })
  mkdirSync(smokeUserDataDir, { recursive: true })
  mkdirSync(smokeDocumentsDir, { recursive: true })
}

function assertFile(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${label} is missing. Expected file: ${path}`)
  }
}

function runPackagedAppSmoke() {
  return new Promise((resolveSmoke, rejectSmoke) => {
    const child = spawn(executablePath, [], {
      cwd: unpackedDir,
      env: {
        ...process.env,
        ELECTRON_RENDERER_URL: '',
        DEEPWORK_USER_DATA_DIR: smokeUserDataDir,
        DEEPWORK_DOCUMENTS_DIR: smokeDocumentsDir,
        DEEPWORK_PACKAGE_SMOKE_RESULT: smokeResultPath,
        DEEPWORK_PACKAGE_SMOKE_TIMEOUT_MS: '1600'
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill()
      rejectSmoke(new Error(`Packaged app smoke timed out. stdout=${stdout} stderr=${stderr}`))
    }, 30_000)

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      rejectSmoke(error)
    })
    child.on('exit', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        rejectSmoke(new Error(`Packaged app exited with code ${code}. stdout=${stdout} stderr=${stderr}`))
        return
      }
      resolveSmoke({ stdout, stderr })
    })
  })
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('Windows package validation must run on Windows.')
  }

  assertFile(executablePath, 'Packaged DeepWork executable')
  assertFile(appAsarPath, 'Packaged app archive')
  resetSmokeDirectory()
  await runPackagedAppSmoke()
  assertFile(smokeResultPath, 'Packaged app smoke result')

  const result = JSON.parse(readFileSync(smokeResultPath, 'utf8'))
  const createdWorkspaceDirectories = workspaceDirectories.filter((name) => existsSync(join(smokeDocumentsDir, name)))

  if (
    result.rendererReady !== true ||
    result.workspaceRoot !== '' ||
    result.workspaceInitialized !== false ||
    result.settingsWorkspaceRoot !== null ||
    createdWorkspaceDirectories.length > 0
  ) {
    throw new Error(
      `Packaged app smoke failed: ${JSON.stringify({
        result,
        createdWorkspaceDirectories
      })}`
    )
  }

  console.log(
    JSON.stringify({
      executablePath,
      appAsarPath,
      rendererReady: result.rendererReady,
      workspaceInitialized: result.workspaceInitialized,
      createdWorkspaceDirectories
    })
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
