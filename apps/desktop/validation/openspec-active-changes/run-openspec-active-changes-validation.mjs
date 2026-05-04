import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function findRepoRoot(startDirectory) {
  let current = startDirectory

  while (current !== dirname(current)) {
    if (existsSync(join(current, 'openspec', 'changes'))) {
      return current
    }

    current = dirname(current)
  }

  return startDirectory
}

const repoRoot = findRepoRoot(dirname(fileURLToPath(import.meta.url)))
const changesRoot = join(repoRoot, 'openspec', 'changes')

function isCompleteTaskFile(path) {
  if (!existsSync(path)) {
    return false
  }

  const content = readFileSync(path, 'utf8')
  const taskLines = content.split(/\r?\n/u).filter((line) => /^- \[[ xX]\]/u.test(line))
  if (taskLines.length === 0) {
    return false
  }

  return taskLines.every((line) => /^- \[[xX]\]/u.test(line))
}

if (!existsSync(changesRoot)) {
  throw new Error(`OpenSpec changes directory is missing: ${changesRoot}`)
}

const completedActiveChanges = readdirSync(changesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'archive')
  .map((entry) => entry.name)
  .filter((changeName) => isCompleteTaskFile(join(changesRoot, changeName, 'tasks.md')))

if (completedActiveChanges.length > 0) {
  throw new Error(
    [
      'Completed OpenSpec changes remain active and should be archived:',
      ...completedActiveChanges.map((changeName) => `- ${changeName}`),
      '',
      'Archive completed changes with: openspec archive <change-name> -y'
    ].join('\n')
  )
}

console.log('OpenSpec active-change hygiene validation passed.')
