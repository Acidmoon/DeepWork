import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sessionName = 'workspace-regression'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const commandShell = process.env.ComSpec ?? 'cmd.exe'
const generatedBootstrapPath = join(__dirname, 'bootstrap.generated.js')
const generatedAssertPath = join(__dirname, 'assert.generated.js')
const artifactsDir = join(__dirname, 'artifacts')
const screenshotPath = join(artifactsDir, 'verification-artifacts.png')
const rendererUrl = 'http://localhost:5173'

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
    if (result.error) {
      console.error(result.error)
    }
    throw new Error(`playwright-cli failed for args: ${args.join(' ')} (status=${result.status ?? 'null'})`)
  }
}

async function assertRendererAvailable() {
  try {
    const response = await fetch(rendererUrl)
    if (!response.ok) {
      throw new Error(`Renderer responded with ${response.status}`)
    }
  } catch (error) {
    throw new Error(
      `Renderer dev server is not reachable at ${rendererUrl}. Start it first with: npm run dev -w @ai-workbench/desktop`
    )
  }
}

function buildBootstrapScript(payload) {
  const serialized = JSON.stringify(payload)

  return `async page => {
  const payload = ${serialized}
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.addInitScript((injected) => {
    const workspaceRoot = injected.workspaceRoot
    window.workbenchShell = {
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
        getState: async () => ({ isRunning: false, status: 'idle' }),
        start: async () => ({ isRunning: true, status: 'running' }),
        restart: async () => null,
        write: async () => null,
        resize: async () => null,
        clear: async () => null,
        onOutput() { return () => {} },
        onStateChanged() { return () => {} }
      },
      workspace: {
        getState: async () => injected.snapshot,
        readArtifact: async artifactId => {
          const artifact = injected.snapshot.artifacts.find(item => item.id === artifactId)
          return artifact ? { artifact, content: injected.contents[artifactId] ?? '' } : null
        },
        deleteScope: async () => injected.snapshot,
        chooseRoot: async () => injected.snapshot,
        saveClipboard: async () => ({ snapshot: injected.snapshot, artifact: null }),
        onStateChanged() { return () => {} }
      },
      settings: {
        getState: async () => ({
          language: 'zh-CN',
          theme: 'light',
          workspaceRoot,
          terminalPreludeCommands: ['proxy_on'],
          webPanels: {},
          customWebPanels: [],
          customTerminalPanels: []
        }),
        update: async update => ({
          language: update.language ?? 'zh-CN',
          theme: update.theme ?? 'light',
          workspaceRoot,
          terminalPreludeCommands: ['proxy_on'],
          webPanels: {},
          customWebPanels: [],
          customTerminalPanels: []
        })
      }
    }
  }, payload)

  await page.goto('${rendererUrl}', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
}`
}

async function main() {
  await assertRendererAvailable()
  mkdirSync(artifactsDir, { recursive: true })

  const snapshot = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'workspace-snapshot.json'), 'utf8'))
  const contents = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'artifact-contents.json'), 'utf8'))
  const payload = {
    snapshot,
    contents,
    workspaceRoot: snapshot.workspaceRoot
  }
  const assertTemplate = readFileSync(join(__dirname, 'assert-workspace-flow.js'), 'utf8')

  writeFileSync(generatedBootstrapPath, buildBootstrapScript(payload), 'utf8')
  writeFileSync(generatedAssertPath, assertTemplate.replace('__SCREENSHOT_PATH__', screenshotPath.replaceAll('\\', '\\\\')), 'utf8')

  try {
    runCli(['open', '--browser', 'msedge', 'about:blank'])
    runCli(['run-code', '--filename', 'bootstrap.generated.js'])
    runCli(['run-code', '--filename', 'assert.generated.js'])
  } finally {
    rmSync(generatedBootstrapPath, { force: true })
    rmSync(generatedAssertPath, { force: true })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
