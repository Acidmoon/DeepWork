import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..', '..', '..')
const deliveryPath = join(repoRoot, 'apps', 'desktop', 'src', 'main', 'remote-output-delivery.ts')

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

const {
  RemoteOutputCoalescer,
  cleanTerminalOutput,
  deliverFeishuOutput,
  isImportantRemoteOutput,
  truncateFeishuOutput
} = await importTranspiled(deliveryPath)

const cleaned = cleanTerminalOutput('\u001b[31mred\u001b[0m\rspinner 1\rfinal line\u001b[2K\nnext\b\bxt\n\n\n')
assert(cleaned.content === 'final line\nnext', `Terminal output should strip ANSI/redraw/control noise: ${JSON.stringify(cleaned)}`)
assert(cleaned.changed === true, 'Cleaner should report changed output when control sequences are removed.')

const truncated = truncateFeishuOutput('abcdefghijklmnopqrstuvwxyz', 12)
assert(truncated.truncated === true, 'Output truncation should report truncation.')
assert(truncated.content.startsWith('[Output truncated]\n'), 'Output truncation should include a notice.')
assert(truncated.content.endsWith('z'), 'Output truncation should keep the tail.')

const untouched = truncateFeishuOutput('short', 12)
assert(untouched.truncated === false && untouched.content === 'short', 'Short output should not be truncated.')
assert(isImportantRemoteOutput('Task completed successfully'), 'Important output detector should recognize completion.')
assert(!isImportantRemoteOutput('ordinary progress line'), 'Important output detector should ignore ordinary progress.')

const scheduled = []
const canceled = []
const delivered = []
const coalescer = new RemoteOutputCoalescer((output) => delivered.push(output), {
  maxMessageCharacters: 100,
  debounceMs: 50,
  proactiveDelivery: false,
  schedule(callback, delayMs) {
    const handle = { callback, delayMs }
    scheduled.push(handle)
    return handle
  },
  cancel(handle) {
    canceled.push(handle)
  }
})
coalescer.push('\u001b[32mhello\u001b[0m')
coalescer.push('world')
assert(scheduled.length === 2, 'Coalescer should debounce successive chunks.')
assert(canceled.length === 1, 'Coalescer should cancel the previous debounce timer.')
scheduled.at(-1).callback()
assert(delivered.length === 1, 'Coalescer should deliver after debounce.')
assert(delivered[0].content === 'helloworld', 'Coalescer should preserve raw chunk continuity before cleaning.')

const redrawDelivered = []
const redrawCoalescer = new RemoteOutputCoalescer((output) => redrawDelivered.push(output), {
  maxMessageCharacters: 100,
  debounceMs: 50,
  proactiveDelivery: false,
  schedule(callback, delayMs) {
    const handle = { callback, delayMs }
    scheduled.push(handle)
    return handle
  },
  cancel(handle) {
    canceled.push(handle)
  }
})
redrawCoalescer.push('W\rWo')
redrawCoalescer.push('\rWork')
scheduled.at(-1).callback()
assert(redrawDelivered[0].content === 'Work', 'Coalescer should clean terminal redraws after raw chunks are merged.')

const proactiveDelivered = []
const proactiveCoalescer = new RemoteOutputCoalescer((output) => proactiveDelivered.push(output), {
  maxMessageCharacters: 12,
  debounceMs: 1000,
  proactiveDelivery: true,
  schedule(callback, delayMs) {
    scheduled.push({ callback, delayMs })
    return scheduled.at(-1)
  },
  cancel(handle) {
    canceled.push(handle)
  }
})
proactiveCoalescer.push('ordinary line')
assert(proactiveDelivered.length === 0, 'Ordinary output should wait for debounce when proactive delivery is enabled.')
proactiveCoalescer.push('completed successfully')
assert(proactiveDelivered.length === 1, 'Important output should flush proactively.')
assert(proactiveDelivered[0].truncated === true, 'Proactive delivery should still apply output bounds.')

class FakeFeishuOutputClient {
  constructor() {
    this.calls = []
    this.failUpdateCard = false
    this.failSendCard = false
    this.failSendText = false
    this.nextId = 1
  }

  async updateCard(messageId, text) {
    this.calls.push({ method: 'updateCard', messageId, text })
    if (this.failUpdateCard) {
      throw new Error('update failed')
    }
  }

  async sendCard(chatId, text) {
    this.calls.push({ method: 'sendCard', chatId, text })
    if (this.failSendCard) {
      throw new Error('card failed')
    }
    return { messageId: `card-${this.nextId++}` }
  }

  async sendText(chatId, text) {
    this.calls.push({ method: 'sendText', chatId, text })
    if (this.failSendText) {
      throw new Error('text failed')
    }
    return { messageId: `text-${this.nextId++}` }
  }
}

const updateClient = new FakeFeishuOutputClient()
const updateResult = await deliverFeishuOutput(updateClient, {
  chatId: 'chat-a',
  messageId: 'card-existing',
  mode: 'card',
  text: 'updated card'
})
assert(updateResult.ok === true && updateResult.usedFallback === false, 'Card update should succeed without fallback.')
assert(updateClient.calls[0].method === 'updateCard', 'Existing card delivery should attempt update first.')

const updateFallbackClient = new FakeFeishuOutputClient()
updateFallbackClient.failUpdateCard = true
const updateFallbackResult = await deliverFeishuOutput(updateFallbackClient, {
  chatId: 'chat-a',
  messageId: 'card-existing',
  mode: 'card',
  text: 'fallback text'
})
assert(updateFallbackResult.ok === true && updateFallbackResult.usedFallback === true, 'Card update failure should fall back to text.')
assert(
  JSON.stringify(updateFallbackClient.calls.map((call) => call.method)) === JSON.stringify(['updateCard', 'sendText']),
  'Update fallback should try card update then text send.'
)

const cardFallbackClient = new FakeFeishuOutputClient()
cardFallbackClient.failSendCard = true
const cardFallbackResult = await deliverFeishuOutput(cardFallbackClient, {
  chatId: 'chat-a',
  mode: 'card',
  text: 'fallback from card send'
})
assert(cardFallbackResult.ok === true && cardFallbackResult.usedFallback === true, 'Card send failure should fall back to text.')

const textFailureClient = new FakeFeishuOutputClient()
textFailureClient.failSendText = true
const textFailureResult = await deliverFeishuOutput(textFailureClient, {
  chatId: 'chat-a',
  mode: 'text',
  text: 'plain text'
})
assert(textFailureResult.ok === false && textFailureResult.error === 'text failed', 'Plain text failure should be reported.')

console.log(
  JSON.stringify({
    cleaned: cleaned.content,
    truncated: truncated.truncated,
    delivered: delivered.length,
    redrawDelivered: redrawDelivered[0].content,
    proactiveDelivered: proactiveDelivered.length,
    updateFallback: updateFallbackResult.usedFallback,
    cardFallback: cardFallbackResult.usedFallback,
    textFailure: textFailureResult.error
  })
)
