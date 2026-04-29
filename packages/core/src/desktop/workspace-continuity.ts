import type { ThreadContinuationPreference } from './settings'
import { getArtifactScopeId, sanitizeThreadId } from './workspace'

export interface WorkspaceContinuityPlanningInput {
  origin: string
  contextLabel?: string | null
  threadContinuationPreference: ThreadContinuationPreference
  activeThreadId?: string | null
  existingScopeThreadId?: string | null
}

export type WorkspaceContinuityPlan =
  | {
      scopeId: string
      decision: 'reuse-existing-scope-thread'
      threadId: string
    }
  | {
      scopeId: string
      decision: 'reuse-active-thread'
      threadId: string
    }
  | {
      scopeId: string
      decision: 'create-thread-seed'
      reason: 'start-new-thread-per-scope' | 'no-active-thread'
    }

export function planImplicitThreadContinuation(input: WorkspaceContinuityPlanningInput): WorkspaceContinuityPlan {
  const scopeId = getArtifactScopeId({
    origin: input.origin || 'manual',
    metadata: {
      contextLabel: input.contextLabel ?? ''
    }
  })

  const existingScopeThreadId = String(input.existingScopeThreadId ?? '').trim()
  if (existingScopeThreadId) {
    return {
      scopeId,
      decision: 'reuse-existing-scope-thread',
      threadId: sanitizeThreadId(existingScopeThreadId, scopeId)
    }
  }

  if (input.threadContinuationPreference === 'continue-active-thread') {
    const activeThreadId = String(input.activeThreadId ?? '').trim()
    if (activeThreadId) {
      return {
        scopeId,
        decision: 'reuse-active-thread',
        threadId: sanitizeThreadId(activeThreadId)
      }
    }

    return {
      scopeId,
      decision: 'create-thread-seed',
      reason: 'no-active-thread'
    }
  }

  return {
    scopeId,
    decision: 'create-thread-seed',
    reason: 'start-new-thread-per-scope'
  }
}
