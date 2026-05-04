## Context

The package validation script verifies that generated Windows alpha and beta packages exist, inspects `resources/app.asar` for forbidden development artifacts, then launches the packaged executable in isolated smoke scenarios. The current script shells out to the `@electron/asar` CLI through `spawnSync(process.execPath, [asarBinPath, 'list', appAsarPath])`. In npm-script execution this can fail with empty stdout and stderr before any package startup smoke runs, while direct `asar list` invocation can still list the archive.

## Goals / Non-Goals

**Goals:**
- Make alpha and beta package validation reliably list archive contents from repo-installed dependencies.
- Keep package boundary checks in-process and deterministic enough to provide actionable diagnostics.
- Remove development-only package inputs that the newly working archive inspection exposes.
- Preserve the existing startup smoke scenarios and package artifact assertions.

**Non-Goals:**
- Remove runtime JavaScript dependencies or Windows native prebuilds required by packaged terminal sessions.
- Add a new package manager dependency solely for archive listing.
- Introduce signing, installers, auto-update, or release-channel changes.

## Decisions

- Use the `@electron/asar` library API from the validation script instead of spawning the CLI for archive listing.
  - Rationale: the library is already installed through existing packaging dependencies, avoids Windows npm-script process wrapping differences, and returns structured data directly to the validation process.
  - Alternative considered: call `npx asar list`. This worked manually but would add another shell layer and keep the validation dependent on command resolution.

- Normalize returned archive paths before applying forbidden-fragment checks.
  - Rationale: `@electron/asar` paths may use platform-specific separators or leading slashes; boundary checks should operate on a stable slash-separated representation.
  - Alternative considered: keep raw CLI output matching. That would preserve the current failure mode and make checks sensitive to command formatting.

- Keep archive listing failure messages explicit.
  - Rationale: if the archive is corrupt or unreadable, release preflight should fail before startup smoke with the archive path and underlying error.

- Tighten Electron Builder file exclusions at the shared alpha configuration inherited by beta.
  - Rationale: the current package includes workspace package TypeScript source, dependency source trees, tests, native build project files, and node-pty build scaffolding. Excluding these at the shared config fixes both package channels consistently.
  - Alternative considered: weaken validation to allow dependency `src/` trees. That would make the smoke pass while preserving oversized and unnecessary release artifacts.

- Narrow `node-pty` unpacking to Windows x64 prebuilds instead of unpacking the entire module tree.
  - Rationale: the runtime needs native `.node` modules and bundled Windows helper binaries outside `app.asar`, but does not need TypeScript sources, tests, build scripts, `deps/`, or Visual Studio project files.
  - Alternative considered: keep unpacking all of `node-pty/**` and only filter archive checks. That would leave large development-only files in the generated package directory.

## Risks / Trade-offs

- Library API shape differs across `@electron/asar` versions -> Import only the narrow `listPackage` capability already provided by the installed package and fail with a clear message if listing throws.
- Boundary checks could miss paths if normalization is incomplete -> Normalize backslashes to slashes and preserve leading slash semantics before matching existing forbidden fragments.
- Overly broad dependency exclusions could remove runtime files -> Keep `node-pty` runtime JS, package metadata, and `prebuilds/win32-x64` available, then validate by launching packaged alpha and beta apps.
