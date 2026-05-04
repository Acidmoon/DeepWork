## Why

Settings no longer has any real deferred preference entries, but the renderer and core model still carry empty placeholder scaffolding and copy for "upcoming" settings. This creates product noise and makes future audits look like unfinished work remains when the default placeholder list is empty.

## What Changes

- Remove the empty Settings placeholder surface from the default renderer experience when no deferred preferences are configured.
- Keep implemented Settings controls for workspace profiles, appearance, terminal behavior, CLI prelude, thread continuation, and CLI retrieval defaults unchanged.
- Retire stale placeholder localization and validation assumptions that refer to already implemented terminal behavior or CLI retrieval preferences.
- Preserve a clear path to reintroduce a deferred preference section later only when a concrete placeholder entry exists.

## Capabilities

### New Capabilities

### Modified Capabilities
- `settings-and-panel-extensibility`: Settings SHALL not expose an empty deferred preference area when no deferred preferences are defined.
- `desktop-workbench-panels`: The Settings surface SHALL remain concise and omit placeholder-only sections unless they contain defined deferred preferences.

## Impact

- Affects core panel defaults, Settings panel rendering, Settings localization, and focused validation assertions that currently look for placeholder-era copy.
- No persisted settings migration is required because the placeholder list is UI metadata, not user data.
- No new runtime dependency is required.
