import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export function syncManagedInstructionFile(path: string, heading: string, block: string): void {
  const beginMarker = `<!-- ${heading}:BEGIN -->`
  const endMarker = `<!-- ${heading}:END -->`
  const managedContent = `${beginMarker}\n${block.trim()}\n${endMarker}\n`

  if (!existsSync(path)) {
    writeFileSync(path, managedContent, 'utf8')
    return
  }

  const current = readFileSync(path, 'utf8')
  if (current.includes(beginMarker) && current.includes(endMarker)) {
    const updated = current.replace(new RegExp(`${beginMarker}[\\s\\S]*?${endMarker}\\n?`, 'm'), managedContent)
    writeFileSync(path, updated, 'utf8')
    return
  }

  const separator = current.endsWith('\n') ? '\n' : '\n\n'
  writeFileSync(path, `${current}${separator}${managedContent}`, 'utf8')
}
