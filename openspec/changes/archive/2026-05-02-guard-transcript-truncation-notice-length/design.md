## Context

`MAX_TRANSCRIPT_CAPTURE_SIZE = 120_000` and `TRANSCRIPT_TRUNCATION_NOTICE` (≈150 chars) are defined as module-level constants in `terminal-manager.ts`. `trimTranscriptCaptureBuffer` subtracts the notice length from the max to compute how much original content to preserve:

```ts
const tailLength = Math.max(0, MAX_TRANSCRIPT_CAPTURE_SIZE - TRANSCRIPT_TRUNCATION_NOTICE.length)
```

Under current values this is safe. But if someone reduces `MAX_TRANSCRIPT_CAPTURE_SIZE` (e.g., to 1_000 for testing, or to a very small value for a different use case), the subtraction could go negative, `Math.max(0, ...)` would produce 0, and the function would return only the notice with zero bytes of actual terminal content.

## Goals / Non-Goals

**Goals:**
- Ensure `tailLength` is never 0 when a notice is prepended.
- Make the invariant explicit so future editors are warned.

**Non-Goals:**
- Change the truncation strategy (bounded buffer with notice prefix).
- Alter `MAX_TRANSCRIPT_CAPTURE_SIZE` or `TRANSCRIPT_TRUNCATION_NOTICE`.

## Decisions

### Use a compile-time assertion (TypeScript `satisfies`-style guard)

Add a module-level assertion:

```ts
// If MAX_TRANSCRIPT_CAPTURE_SIZE is reduced, ensure it still exceeds the notice length
const _assertTranscriptCaptureSize: true =
  MAX_TRANSCRIPT_CAPTURE_SIZE > TRANSCRIPT_TRUNCATION_NOTICE.length || (() => { throw new Error('MAX_TRANSCRIPT_CAPTURE_SIZE must exceed TRANSCRIPT_TRUNCATION_NOTICE.length') })()
```

This evaluates at module load time and throws immediately if the invariant is violated.

Alternative considered: `assert.ok(MAX_TRANSCRIPT_CAPTURE_SIZE > TRANSCRIPT_TRUNCATION_NOTICE.length)`. This requires importing `node:assert` which adds a dependency. The inline expression achieves the same without imports.

Alternative considered: simply documenting the invariant with a comment. Comments don't enforce anything — the check should be programmatic.

## Risks / Trade-offs

- The assertion runs once at module load. If it throws, the app fails to start (fail-fast). This is preferable to silently losing terminal transcript data.
- No runtime overhead after module load — the assertion is executed once and the `_assertTranscriptCaptureSize` variable is dead code eliminated by modern bundlers.
