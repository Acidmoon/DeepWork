## 1. Package Archive Listing

- [x] 1.1 Replace CLI-based `app.asar` listing in the Windows package validation script with the `@electron/asar` library API.
- [x] 1.2 Normalize archive entry paths before applying forbidden package-boundary checks.
- [x] 1.3 Improve archive-listing failure output so it includes the package channel and archive path.
- [x] 1.4 Tighten shared Electron Builder file exclusions so alpha and beta packages omit source trees, tests, logs, validation assets, and native build scaffolding.
- [x] 1.5 Narrow `node-pty` unpacking to the Windows x64 runtime prebuilds required by the packaged terminal runtime.

## 2. Validation

- [x] 2.1 Rebuild the alpha and beta Windows packages after the packaging boundary changes.
- [x] 2.2 Run `npm run validate:package-win` and confirm alpha package smoke passes.
- [x] 2.3 Run `npm run validate:package-win-beta` and confirm beta package smoke passes.
- [x] 2.4 Run `npm run typecheck` and `npx openspec validate --all --strict`.
