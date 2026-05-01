## Why

`trimTranscriptCaptureBuffer` in `terminal-manager.ts` computes the tail length as `MAX_TRANSCRIPT_CAPTURE_SIZE - TRANSCRIPT_TRUNCATION_NOTICE.length`, clamped to 0 via `Math.max`. If `MAX_TRANSCRIPT_CAPTURE_SIZE` is ever reduced below the notice string's length, `tailLength` becomes 0 and **all** original terminal content is silently dropped — only the truncation notice survives. This is an implicit coupling between two constants that the compiler cannot enforce.

## What Changes

- Assert at module scope that `MAX_TRANSCRIPT_CAPTURE_SIZE` exceeds `TRANSCRIPT_TRUNCATION_NOTICE.length`, or compute `tailLength` in a way that always preserves at least some original content when notice is prepended.

## Capabilities

### New Capabilities
- None (implementation-only hardening).

### Modified Capabilities
- None.

## Impact

- Affected code: `apps/desktop/src/main/terminal-manager.ts` lines 28, 32, 238–241.
- No behavioral change under current values (`MAX_TRANSCRIPT_CAPTURE_SIZE` = 120_000, notice ≈ 150 chars).
