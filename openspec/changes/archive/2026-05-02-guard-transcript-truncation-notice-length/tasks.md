## 1. Add invariant guard

- [x] 1.1 Add a module-level assertion in `apps/desktop/src/main/terminal-manager.ts` that ensures `MAX_TRANSCRIPT_CAPTURE_SIZE > TRANSCRIPT_TRUNCATION_NOTICE.length` that ensures `MAX_TRANSCRIPT_CAPTURE_SIZE > TRANSCRIPT_TRUNCATION_NOTICE.length`

## 2. Verify

- [x] 2.1 Run `npm run typecheck` to confirm no type errors
- [x] 2.2 Temporarily reduce `MAX_TRANSCRIPT_CAPTURE_SIZE` to 10 and confirm the assertion triggers on load
