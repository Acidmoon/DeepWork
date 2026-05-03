import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(__dirname, '..', '..')
const repoRoot = resolve(desktopRoot, '..', '..')
const channel = parseChannel(process.argv.slice(2))
const packageRoot = join(repoRoot, 'release', channel === 'beta' ? 'windows-beta' : 'windows-alpha')
const unpackedDir = join(packageRoot, 'win-unpacked')
const executablePath = join(unpackedDir, 'DeepWork.exe')
const resourcesPath = join(unpackedDir, 'resources')
const appAsarPath = join(resourcesPath, 'app.asar')
const smokeRoot = join(__dirname, channel === 'beta' ? '.smoke-package-win-beta' : '.smoke-package-win')
const smokeUserDataDir = join(smokeRoot, 'user-data')
const smokeDocumentsDir = join(smokeRoot, 'documents')
const smokeResultPath = join(smokeRoot, 'result.json')
const workspaceDirectories = ['artifacts', 'outputs', 'manifests', 'rules', 'logs']

function parseChannel(args) {
  const channelIndex = args.findIndex((value) => value === '--channel')
  if (channelIndex < 0) {
    return 'alpha'
  }

  const requested = args[channelIndex + 1]?.trim().toLowerCase()
  return requested === 'beta' ? 'beta' : 'alpha'
}

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

function assertDirectory(path, label) {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`${label} is missing. Expected directory: ${path}`)
  }
}

function runPackagedAppSmoke({
  userDataDir,
  documentsDir,
  resultPath
}) {
  return new Promise((resolveSmoke, rejectSmoke) => {
    const child = spawn(executablePath, [], {
      cwd: unpackedDir,
      env: {
        ...process.env,
        ELECTRON_RENDERER_URL: '',
        DEEPWORK_USER_DATA_DIR: userDataDir,
        DEEPWORK_DOCUMENTS_DIR: documentsDir,
        DEEPWORK_PACKAGE_SMOKE_RESULT: resultPath,
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

function listAsarFiles() {
  const asarBinPath = join(repoRoot, 'node_modules', '@electron', 'asar', 'bin', 'asar.js')
  const result = spawnSync(process.execPath, [asarBinPath, 'list', appAsarPath], {
    cwd: repoRoot,
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    throw new Error(
      `Failed to list app.asar contents for ${channel}. stdout=${result.stdout ?? ''} stderr=${result.stderr ?? ''}`
    )
  }

  return (result.stdout ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

function assertArtifactBoundaries() {
  const files = listAsarFiles()
  const forbiddenFragments = ['/validation/', '/src/', '/release/', '/artifacts/', '/.playwright-cli/', '.log']
  const matchedForbidden = files.filter((entry) => forbiddenFragments.some((fragment) => entry.includes(fragment)))
  if (matchedForbidden.length > 0) {
    throw new Error(`Packaged ${channel} app.asar included forbidden development artifacts: ${matchedForbidden.join(', ')}`)
  }
}

function createNormalizedSettingsFixture() {
  const profileRoot = join(smokeDocumentsDir, 'Saved Workspace Beta')
  mkdirSync(profileRoot, { recursive: true })

  return {
    language: 'en-US',
    theme: 'dark',
    workspaceRoot: '   ',
    workspaceProfiles: [
      {
        id: 'workspace-beta-a',
        name: '  Beta Saved Workspace  ',
        root: `${profileRoot}\\`,
        createdAt: '2026-05-01T00:00:00.000Z',
        lastUsedAt: '2026-05-02T00:00:00.000Z'
      },
      {
        id: 'workspace-beta-duplicate',
        name: 'Should be dropped',
        root: `${profileRoot}\\\\`,
        createdAt: '2026-05-01T00:00:00.000Z',
        lastUsedAt: '2026-05-02T00:00:00.000Z'
      }
    ],
    defaultWorkspaceProfileId: 'workspace-beta-a',
    terminalPreludeCommands: ['proxy_on', '  beta_boot  ', '', 42],
    terminalBehavior: {
      scrollbackLines: '2500',
      copyOnSelection: true,
      confirmMultilinePaste: false
    },
    threadContinuationPreference: 'start-new-thread-per-scope',
    cliRetrievalPreference: 'global-first',
    webPanels: {
      'minimax-web': {
        homeUrl: 'agent.minimaxi.com',
        partition: 'persist:minimax-beta',
        enabled: true
      }
    },
    builtInTerminalPanels: {
      'codex-cli': {
        cwd: `${profileRoot}\\cli\\`,
        startupCommand: 'codex --model gpt-5.5'
      }
    },
    customWebPanels: [
      {
        id: 'custom-beta-web',
        title: 'Beta Docs',
        sectionId: 'web',
        homeUrl: 'docs.example.com/beta',
        partition: '',
        enabled: true
      }
    ],
    customTerminalPanels: [
      {
        id: 'custom-beta-cli',
        title: 'Beta Runner',
        sectionId: 'agents',
        shell: 'powershell.exe',
        shellArgs: ['-NoLogo', '', '  -ExecutionPolicy  ', 'Bypass'],
        cwd: `${profileRoot}\\tools\\`,
        startupCommand: 'npm run beta'
      }
    ]
  }
}

function writeSettingsFixture(settings) {
  const settingsPath = join(smokeUserDataDir, 'settings.json')
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
  return settingsPath
}

async function runUnselectedWorkspaceScenario() {
  await runPackagedAppSmoke({
    userDataDir: smokeUserDataDir,
    documentsDir: smokeDocumentsDir,
    resultPath: smokeResultPath
  })
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
      `Packaged ${channel} unselected-workspace smoke failed: ${JSON.stringify({
        result,
        createdWorkspaceDirectories
      })}`
    )
  }

  return {
    result,
    createdWorkspaceDirectories
  }
}

async function runNormalizedSettingsScenario() {
  const settingsFixture = createNormalizedSettingsFixture()
  writeSettingsFixture(settingsFixture)

  await runPackagedAppSmoke({
    userDataDir: smokeUserDataDir,
    documentsDir: smokeDocumentsDir,
    resultPath: smokeResultPath
  })
  assertFile(smokeResultPath, 'Packaged app normalized-settings smoke result')

  const result = JSON.parse(readFileSync(smokeResultPath, 'utf8'))
  const normalizedSettings = result.settingsSnapshot
  const expectedWorkspaceRoot = join(smokeDocumentsDir, 'Saved Workspace Beta')

  if (
    result.rendererReady !== true ||
    result.workspaceRoot !== expectedWorkspaceRoot ||
    result.workspaceInitialized !== true ||
    result.settingsWorkspaceRoot !== null
  ) {
    throw new Error(
      `Packaged beta normalized-settings smoke failed: ${JSON.stringify({
        result,
        expectedWorkspaceRoot
      })}`
    )
  }

  if (
    !normalizedSettings ||
    normalizedSettings.defaultWorkspaceProfileId !== 'workspace-beta-a' ||
    normalizedSettings.workspaceProfiles.length !== 1 ||
    normalizedSettings.workspaceProfiles[0]?.root !== expectedWorkspaceRoot ||
    normalizedSettings.workspaceProfiles[0]?.name !== 'Beta Saved Workspace' ||
    normalizedSettings.webPanels?.['minimax-web']?.homeUrl !== 'https://agent.minimaxi.com/' ||
    normalizedSettings.customWebPanels?.[0]?.homeUrl !== 'https://docs.example.com/beta' ||
    normalizedSettings.customWebPanels?.[0]?.partition !== 'persist:custom-beta-web' ||
    normalizedSettings.customTerminalPanels?.[0]?.shellArgs?.join('|') !== '-NoLogo|-ExecutionPolicy|Bypass' ||
    normalizedSettings.terminalPreludeCommands?.join('|') !== 'proxy_on|beta_boot' ||
    normalizedSettings.terminalBehavior?.scrollbackLines !== 2500 ||
    normalizedSettings.cliRetrievalPreference !== 'global-first' ||
    normalizedSettings.threadContinuationPreference !== 'start-new-thread-per-scope'
  ) {
    throw new Error(
      `Packaged beta settings normalization failed: ${JSON.stringify({
        normalizedSettings,
        expectedWorkspaceRoot
      })}`
    )
  }

  const createdWorkspaceDirectories = workspaceDirectories.filter((name) => existsSync(join(expectedWorkspaceRoot, name)))
  if (createdWorkspaceDirectories.length !== workspaceDirectories.length) {
    throw new Error(
      `Packaged beta expected initialized workspace directories were incomplete: ${JSON.stringify({
        expectedWorkspaceRoot,
        createdWorkspaceDirectories
      })}`
    )
  }

  return {
    result,
    normalizedSettings,
    expectedWorkspaceRoot,
    createdWorkspaceDirectories
  }
}

async function main() {
  if (process.platform !== 'win32') {
    throw new Error('Windows package validation must run on Windows.')
  }

  assertDirectory(packageRoot, `Packaged ${channel} output directory`)
  assertDirectory(unpackedDir, `Packaged ${channel} unpacked output directory`)
  assertFile(executablePath, 'Packaged DeepWork executable')
  assertFile(appAsarPath, 'Packaged app archive')
  assertArtifactBoundaries()

  resetSmokeDirectory()
  const unselectedWorkspace = await runUnselectedWorkspaceScenario()

  let normalizedSettings = null
  if (channel === 'beta') {
    resetSmokeDirectory()
    normalizedSettings = await runNormalizedSettingsScenario()
  }

  console.log(
    JSON.stringify({
      channel,
      packageRoot,
      executablePath,
      appAsarPath,
      unselectedWorkspace,
      normalizedSettings: normalizedSettings
        ? {
            workspaceRoot: normalizedSettings.result.workspaceRoot,
            workspaceInitialized: normalizedSettings.result.workspaceInitialized,
            defaultWorkspaceProfileId: normalizedSettings.normalizedSettings.defaultWorkspaceProfileId,
            workspaceProfiles: normalizedSettings.normalizedSettings.workspaceProfiles.length,
            customWebPanels: normalizedSettings.normalizedSettings.customWebPanels.length,
            customTerminalPanels: normalizedSettings.normalizedSettings.customTerminalPanels.length
          }
        : null
    })
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
