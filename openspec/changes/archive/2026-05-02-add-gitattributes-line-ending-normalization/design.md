## Context

Git can automatically convert line endings between LF (Unix/macOS) and CRLF (Windows) based on `.gitattributes` rules. Without this file, each developer's `core.autocrlf` setting determines behavior, leading to inconsistent line endings across the team.

The `* text=auto` rule tells Git to:
- Detect which files are text (vs binary) automatically
- Store text files with LF in the repository
- Check out text files with the platform's native line ending (CRLF on Windows, LF on Unix)

## Goals / Non-Goals

**Goals:**
- Eliminate LF↔CRLF warnings during `git diff` on Windows.
- Ensure consistent LF line endings in the repository for all text files.

**Non-Goals:**
- Force specific line endings for particular file types beyond auto-detection.
- Re-normalize the entire repository history (this only affects future commits).

## Decisions

### Use `* text=auto` as the only rule

This is the simplest rule that achieves the goal. It lets Git's built-in binary detection avoid corrupting binary files while normalizing all text files.

Alternative considered: explicit per-extension rules (e.g., `*.ts text`, `*.json text`). This is more verbose and requires ongoing maintenance as new file types are added.

## Risks / Trade-offs

- First `git add` after adding `.gitattributes` will show every text file as modified (one-time normalization). This is cosmetic and expected.
- Files already tracked with CRLF will be converted to LF on next commit. CI, editors, and build tools should handle this transparently since LF is the standard for source code.
