## Why

The repository has no `.gitattributes` file to declare line-ending normalization behavior. On Windows, `git diff` emits LF→CRLF conversion warnings for every modified file, and inconsistent line endings between Windows and Unix developers can cause spurious diffs and merge conflicts.

## What Changes

- Add `.gitattributes` at the repo root with `* text=auto` to let Git auto-detect text files and normalize line endings.

## Capabilities

### New Capabilities
- None (repo configuration only).

### Modified Capabilities
- None.

## Impact

- Affected files: new `.gitattributes` at repo root.
- No code or runtime behavior change.
- Existing files will be normalized on next `git add` (one-time CRLF→LF conversion for tracked text files).
