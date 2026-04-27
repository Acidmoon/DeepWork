import type { ArtifactRecord } from '@ai-workbench/core/desktop/workspace'

export interface PromptBuildInput {
  workspaceRoot: string
  rulesPath: string
  contextIndexPath: string
  origin: string
  artifacts: ArtifactRecord[]
  targetPanelId: string
}

function resolveTargetProfile(panelId: string): {
  instructionsFile: string
  outputDirectory: string
  assistantName: string
} {
  if (panelId === 'codex-cli') {
    return {
      instructionsFile: 'CODEX_INSTRUCTIONS.md',
      outputDirectory: 'outputs/codex',
      assistantName: 'Codex CLI'
    }
  }

  if (panelId === 'claude-code') {
    return {
      instructionsFile: 'CLAUDE_INSTRUCTIONS.md',
      outputDirectory: 'outputs/claude-code',
      assistantName: 'Claude Code'
    }
  }

  return {
    instructionsFile: 'WORKSPACE_PROTOCOL.md',
    outputDirectory: 'outputs/agent',
    assistantName: panelId
  }
}

export function buildAgentPrompt(input: PromptBuildInput): string {
  const target = resolveTargetProfile(input.targetPanelId)
  const artifactLines = input.artifacts
    .map(
      (artifact, index) =>
        `${index + 1}. ${artifact.id}\n   - path: ${artifact.absolutePath}\n   - origin: ${artifact.origin}\n   - summary: ${artifact.summary}`
    )
    .join('\n')

  return [
    `You are working inside DeepWork and this prompt is intended for ${target.assistantName}.`,
    '',
    'Read these files first:',
    `- ${input.rulesPath}\\WORKSPACE_PROTOCOL.md`,
    `- ${input.rulesPath}\\${target.instructionsFile}`,
    `- ${input.contextIndexPath}`,
    '',
    `Selected context origin: ${input.origin}`,
    `Workspace root: ${input.workspaceRoot}`,
    `Suggested output directory: ${input.workspaceRoot}\\${target.outputDirectory}`,
    '',
    'Only use the following artifacts as context. Do not scan unrelated files or load the entire workspace:',
    artifactLines || '- No artifacts selected.',
    '',
    'Constraints:',
    '- Only read the artifact files listed above.',
    '- Do not recursively scan the workspace.',
    '- If more context is needed, ask for a specific artifact instead of guessing.',
    '- Write any new output back into the suggested output directory unless instructed otherwise.',
    '',
    'Task:',
    '- Use the selected artifacts as the working context for the current request.',
    '- Keep your output scoped to this origin-specific context rather than mixing in unrelated conversations.'
  ].join('\n')
}
