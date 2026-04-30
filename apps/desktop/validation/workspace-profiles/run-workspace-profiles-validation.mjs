import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { assertValidationRendererAvailable, resolveValidationRendererEntrypoint } from '../renderer-entrypoint.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'workspace-profiles'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
let rendererEntrypoint = null
let rendererUrlLiteral = null

function getRendererEntrypoint() {
  if (!rendererEntrypoint) {
    rendererEntrypoint = resolveValidationRendererEntrypoint()
    rendererUrlLiteral = JSON.stringify(rendererEntrypoint.url)
  }

  return rendererEntrypoint
}

function quoteForCmd(value) {
  if (!/[ \t"]/u.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '\\"')}"`
}

function runCli(args) {
  const command = [npxCommand, '--yes', '--package', '@playwright/cli', 'playwright-cli', '--session', sessionName, ...args]
    .map(quoteForCmd)
    .join(' ')
  const result =
    process.platform === 'win32'
      ? spawnSync(commandShell, ['/d', '/s', '/c', command], { cwd: __dirname, encoding: 'utf8' })
      : spawnSync(npxCommand, ['--yes', '--package', '@playwright/cli', 'playwright-cli', '--session', sessionName, ...args], {
          cwd: __dirname,
          encoding: 'utf8'
        })

  if (result.status !== 0) {
    if (result.stdout) {
      console.error(result.stdout)
    }
    if (result.stderr) {
      console.error(result.stderr)
    }
    throw new Error(`playwright-cli failed for args: ${args.join(' ')} (status=${result.status ?? 'null'})`)
  }
}

function buildBootstrapScript() {
  return `async page => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.addInitScript(() => {
    const clone = value => JSON.parse(JSON.stringify(value))
    const workspaceListeners = new Set()
    let settings = {
      language: 'en-US',
      theme: 'light',
      workspaceRoot: 'E:\\\\DeepWork\\\\ProjectA',
      workspaceProfiles: [],
      defaultWorkspaceProfileId: null,
      terminalPreludeCommands: ['proxy_on'],
      terminalBehavior: { scrollbackLines: 1000, copyOnSelection: false, confirmMultilinePaste: true },
      threadContinuationPreference: 'continue-active-thread',
      cliRetrievalPreference: 'thread-first',
      webPanels: {},
      builtInTerminalPanels: {},
      customWebPanels: [],
      customTerminalPanels: []
    }
    let workspaceSnapshot = {
      projectId: 'ProjectA',
      workspaceRoot: settings.workspaceRoot,
      manifestPath: '',
      contextIndexPath: '',
      originManifestsPath: '',
      threadIndexPath: '',
      threadManifestsPath: '',
      rulesPath: '',
      initialized: true,
      artifactCount: 0,
      bucketCounts: {},
      contextEntries: [],
      threads: [],
      activeThreadId: null,
      activeThreadTitle: null,
      artifacts: [],
      recentArtifacts: [],
      lastSavedArtifactId: null,
      lastError: null
    }

    const publishWorkspace = () => {
      for (const listener of workspaceListeners) {
        listener(clone(workspaceSnapshot))
      }
    }

    window.__workspaceProfileValidation = {
      getState: () => clone({ settings, workspaceSnapshot })
    }

    window.workbenchShell = {
      platform: 'win32',
      versions: { electron: 'test', chrome: 'test', node: 'test' },
      clipboard: { writeText() {}, readText() { return '' } },
      webPanels: {
        getState: async () => null,
        show: async () => null,
        hide: async () => null,
        updateBounds: async () => null,
        navigate: async () => null,
        updateConfig: async () => null,
        onStateChanged() { return () => {} }
      },
      terminals: {
        attach: async () => null,
        getState: async () => null,
        start: async () => null,
        restart: async () => null,
        write: async () => null,
        resize: async () => null,
        clear: async () => null,
        onOutput() { return () => {} },
        onStateChanged() { return () => {} }
      },
      workspace: {
        getState: async () => clone(workspaceSnapshot),
        readArtifact: async () => null,
        deleteScope: async () => null,
        createThread: async () => clone(workspaceSnapshot),
        selectThread: async () => clone(workspaceSnapshot),
        renameThread: async () => clone(workspaceSnapshot),
        reassignScopeThread: async () => clone(workspaceSnapshot),
        resync: async () => clone(workspaceSnapshot),
        chooseRoot: async () => clone(workspaceSnapshot),
        openProfile: async profileId => {
          const profile = settings.workspaceProfiles.find(item => item.id === profileId)
          if (!profile) {
            return { settings: clone(settings), workspace: clone(workspaceSnapshot), error: 'Workspace profile is unavailable.' }
          }
          settings = {
            ...settings,
            workspaceRoot: profile.root,
            workspaceProfiles: settings.workspaceProfiles.map(item =>
              item.id === profile.id ? { ...item, lastUsedAt: '2026-04-30T01:00:00.000Z' } : item
            )
          }
          workspaceSnapshot = { ...workspaceSnapshot, workspaceRoot: profile.root, initialized: true }
          publishWorkspace()
          return { settings: clone(settings), workspace: clone(workspaceSnapshot), error: null }
        },
        saveClipboard: async () => null,
        onStateChanged(listener) {
          workspaceListeners.add(listener)
          return () => workspaceListeners.delete(listener)
        }
      },
      settings: {
        getState: async () => clone(settings),
        update: async update => {
          settings = {
            ...settings,
            ...update,
            workspaceProfiles: update.workspaceProfiles ?? settings.workspaceProfiles,
            defaultWorkspaceProfileId:
              Object.prototype.hasOwnProperty.call(update, 'defaultWorkspaceProfileId')
                ? update.defaultWorkspaceProfileId
                : settings.defaultWorkspaceProfileId,
            terminalPreludeCommands: update.terminalPreludeCommands ?? settings.terminalPreludeCommands,
            terminalBehavior: update.terminalBehavior ? { ...settings.terminalBehavior, ...update.terminalBehavior } : settings.terminalBehavior,
            threadContinuationPreference: update.threadContinuationPreference ?? settings.threadContinuationPreference,
            cliRetrievalPreference: update.cliRetrievalPreference ?? settings.cliRetrievalPreference,
            webPanels: update.webPanels ?? settings.webPanels,
            builtInTerminalPanels: update.builtInTerminalPanels ?? settings.builtInTerminalPanels,
            customWebPanels: update.customWebPanels ?? settings.customWebPanels,
            customTerminalPanels: update.customTerminalPanels ?? settings.customTerminalPanels
          }
          return clone(settings)
        }
      }
    }
  })
  await page.goto(${rendererUrlLiteral}, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
}`
}

function buildAssertScript() {
  return `async page => {
  const settingsButton = page.getByRole('button', { name: /Settings/ }).first()
  await settingsButton.click()
  await page.getByRole('textbox', { name: /Profile Name/ }).fill('Project A')
  await page.getByRole('button', { name: /Save Current Workspace/ }).click()
  await page.waitForTimeout(300)

  let state = await page.evaluate(() => window.__workspaceProfileValidation.getState())
  if (state.settings.workspaceProfiles.length !== 1) {
    throw new Error('Expected one saved workspace profile')
  }
  const profile = state.settings.workspaceProfiles[0]
  if (profile.name !== 'Project A' || profile.root !== 'E:\\\\DeepWork\\\\ProjectA') {
    throw new Error('Saved workspace profile metadata did not match expected values')
  }

  await page.getByRole('button', { name: /Set Startup Default/ }).click()
  await page.waitForTimeout(300)
  state = await page.evaluate(() => window.__workspaceProfileValidation.getState())
  if (state.settings.defaultWorkspaceProfileId !== profile.id) {
    throw new Error('Expected profile to be saved as startup default')
  }

  await page.getByRole('button', { name: /^Open$/ }).click()
  await page.waitForTimeout(300)
  state = await page.evaluate(() => window.__workspaceProfileValidation.getState())
  if (state.workspaceSnapshot.workspaceRoot !== profile.root) {
    throw new Error('Expected opening profile to synchronize active workspace root')
  }

  await page.getByRole('button', { name: /Remove Profile/ }).click()
  await page.waitForTimeout(300)
  state = await page.evaluate(() => window.__workspaceProfileValidation.getState())
  if (state.settings.workspaceProfiles.length !== 0) {
    throw new Error('Expected profile removal to remove only the settings record')
  }
  if (state.settings.defaultWorkspaceProfileId !== null) {
    throw new Error('Expected default profile id to clear when removing default profile')
  }
}`
}

async function main() {
  await assertValidationRendererAvailable(getRendererEntrypoint())
  mkdirSync(__dirname, { recursive: true })
  writeFileSync(generatedBootstrapPath, buildBootstrapScript(), 'utf8')
  writeFileSync(generatedAssertPath, buildAssertScript(), 'utf8')

  try {
    runCli(['open', '--browser', 'msedge', 'about:blank'])
    runCli(['run-code', '--filename', 'bootstrap.generated.js'])
    runCli(['run-code', '--filename', 'assert.generated.js'])
  } finally {
    rmSync(generatedBootstrapPath, { force: true })
    rmSync(generatedAssertPath, { force: true })
  }

  console.log('Workspace profile validation passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
