import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const featureDetectionPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'codex-app-server', 'feature-detection.ts')
const prototypeClientPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'codex-app-server', 'prototype-client.ts')
const protocolRoot = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'codex-app-server', 'protocol')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function importTranspiled(path) {
  const source = readFileSync(path, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true
    },
    fileName: path
  })
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`

  return import(moduleUrl)
}

class FakeCodexAppServerTransport {
  constructor() {
    this.requests = []
    this.events = [
      {
        method: 'turn/completed',
        params: {
          threadId: 'thread-1',
          turnId: 'turn-1'
        }
      }
    ]
  }

  async request(method, params) {
    this.requests.push({ method, params })
    switch (method) {
      case 'initialize':
        assert(params.capabilities?.experimentalApi === true, 'Initialize should declare experimentalApi capability.')
        return { serverInfo: { name: 'fake-codex-app-server' } }
      case 'thread/start':
        return { threadId: 'thread-1' }
      case 'turn/start':
        return { turnId: 'turn-1' }
      case 'turn/interrupt':
        return { interrupted: true }
      default:
        throw new Error(`Unexpected method: ${method}`)
    }
  }

  async readEvent() {
    return this.events.shift() ?? null
  }
}

const {
  REQUIRED_CODEX_APP_SERVER_METHODS,
  detectCodexAppServerFeatures,
  detectGeneratedProtocolMethods
} = await importTranspiled(featureDetectionPath)
const { CodexAppServerPrototypeClient, CodexAppServerStdioTransport } = await importTranspiled(prototypeClientPath)
const prototypeSource = readFileSync(prototypeClientPath, 'utf8')
assert(
  prototypeSource.includes('resolveWindowsCodexAppServerCommand'),
  'Stdio transport should resolve the real Windows Codex executable instead of spawning codex.cmd directly.'
)
assert(
  prototypeSource.includes('codex-win32-x64'),
  'Windows transport resolution should support the npm-installed Codex native binary.'
)
assert(
  prototypeSource.includes('closeReason'),
  'Stdio transport should preserve the concrete close reason for later request errors.'
)

const generatedMethods = detectGeneratedProtocolMethods(protocolRoot)
for (const method of REQUIRED_CODEX_APP_SERVER_METHODS) {
  assert(generatedMethods.includes(method), `Generated protocol should include ${method}.`)
}

const detection = detectCodexAppServerFeatures(protocolRoot)
if (detection.codexAvailable) {
  assert(detection.version?.startsWith('codex-cli 0.128.0'), `Unexpected Codex CLI version: ${detection.version}`)
  assert(detection.appServerAvailable === true, 'codex app-server should be available.')
  assert(detection.generateTypesAvailable === true, 'codex app-server generate-ts should be available.')
  assert(detection.generateJsonSchemaAvailable === true, 'codex app-server generate-json-schema should be available.')
} else {
  assert(
    detection.error?.includes('spawnSync'),
    `Codex feature detection should either succeed or report sandboxed spawn failure: ${detection.error}`
  )
}
assert(detection.missingMethods.length === 0, `Required app-server methods should be present: ${detection.missingMethods.join(', ')}`)

const transport = new FakeCodexAppServerTransport()
const client = new CodexAppServerPrototypeClient(transport)
await client.initialize()
const thread = await client.startThread({ cwd: 'E:\\workspace', model: 'gpt-5.5' })
const turn = await client.startTurn(thread.threadId, 'continue remotely')
const interrupt = await client.interruptTurn(thread.threadId, turn.turnId)
const event = await client.readEvent()
const missingCommandTransport = new CodexAppServerStdioTransport({
  command: 'deepwork-codex-app-server-command-that-does-not-exist',
  requestTimeoutMs: 1000
})
let missingCommandRejected = false
try {
  await missingCommandTransport.request('initialize', {})
} catch (error) {
  missingCommandRejected = error instanceof Error && error.message.length > 0
} finally {
  missingCommandTransport.dispose()
}

assert(thread.threadId === 'thread-1', 'Prototype client should read thread identity from thread/start.')
assert(turn.turnId === 'turn-1', 'Prototype client should read turn identity from turn/start.')
assert(interrupt.interrupted === true, 'Prototype client should map turn/interrupt.')
assert(event?.method === 'turn/completed', 'Prototype client should expose event reading.')
assert(missingCommandRejected, 'Stdio transport should construct lazily and reject requests when app-server startup fails.')
assert(
  JSON.stringify(transport.requests.map((request) => request.method)) ===
    JSON.stringify(['initialize', 'thread/start', 'turn/start', 'turn/interrupt']),
  'Prototype client should call initialize, thread/start, turn/start, and turn/interrupt in order.'
)

console.log(
  JSON.stringify({
    version: detection.version,
    appServerAvailable: detection.appServerAvailable,
    requiredMethods: REQUIRED_CODEX_APP_SERVER_METHODS,
    generatedMethodCount: generatedMethods.length,
    prototypeMethods: transport.requests.map((request) => request.method),
    eventMethod: event.method,
    lazyStartupFailureHandled: missingCommandRejected
  })
)
