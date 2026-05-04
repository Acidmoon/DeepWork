## 1. Settings Placeholder Cleanup

- [x] 1.1 Remove or gate the Settings deferred placeholder section so it does not render when `defaultSettingsPlaceholders` is empty.
- [x] 1.2 Remove stale placeholder localization entries for terminal behavior or CLI retrieval settings that are now implemented controls.
- [x] 1.3 Update Settings view-state notes and core defaults so they describe current implemented preferences without placeholder language.

## 2. Validation Updates

- [x] 2.1 Update focused terminal behavior and Settings validation assertions to target implemented Settings controls rather than legacy placeholder text.
- [x] 2.2 Update visual smoke expectations if Settings section counts or headings change.

## 3. Verification

- [x] 3.1 Run `npm run typecheck`.
- [x] 3.2 Run `npm run validate:terminal-behavior` and `npm run validate:visual-smoke`.
- [x] 3.3 Run `npx openspec validate --all --strict`.
