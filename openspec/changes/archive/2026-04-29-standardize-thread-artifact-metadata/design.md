## Context

DeepWork already stores multiple artifact classes inside the same workspace model, but each producer still brings its own summary and metadata conventions. Terminal transcripts derive human text differently from managed web captures, retrieval audits use structured log metadata, and legacy records may be missing fields that newer flows assume. The result is not a storage failure; it is an inspection and indexing inconsistency that becomes more visible as threads accumulate heterogeneous records.

This change needs to preserve the existing manifest-first architecture. The repository already relies on `ArtifactRecord` plus a flexible `metadata` bag, so the design should tighten producer conventions and rebuild behavior instead of introducing a parallel schema or destructive content migration.

## Goals / Non-Goals

**Goals:**
- Make thread-linked artifact summaries, tags, and inspection metadata consistent across artifact producers.
- Preserve backward compatibility for previously saved workspace records.
- Improve cross-artifact grouping and retrieval inspection without changing raw content storage.

**Non-Goals:**
- Introducing a database-backed metadata model or a new manifest format.
- Rewriting raw artifact files that were already saved in older workspaces.
- Redesigning workspace browsing order or preview actions beyond what normalized metadata enables.

## Decisions

### Normalize metadata at write time and at rebuild time
New artifacts should be emitted with normalized summaries, tags, and thread-linked inspection fields as soon as they are written. Older artifacts should gain the same inspection shape during manifest and index rebuilds so the workspace stays readable without destructive migration.

Alternative considered: run a one-time migration that rewrites every old manifest record or raw artifact file. Rejected because it adds unnecessary recovery risk for an internal alpha and does not improve the runtime contract more than rebuild-time normalization does.

### Reuse `ArtifactRecord` and the existing metadata bag
The current storage model is flexible enough for this change. The implementation should define a small set of normalized inspection fields and ensure each producer populates the applicable subset consistently rather than introducing a second artifact schema.

Alternative considered: add a versioned per-artifact metadata schema with mandatory per-type subdocuments. Rejected because it would create broad migration and compatibility work before the current artifact model has stabilized.

### Keep retrieval audits as first-class artifacts but align their inspection shape
Retrieval audits already belong in the workspace as inspectable artifacts. The improvement is to give them the same summary, tagging, and thread/session identity conventions as other saved records so thread-level inspection can compare outcomes without special parsing logic.

Alternative considered: keep retrieval audits as special-case logs outside normal artifact browsing. Rejected because the current product direction is to inspect retrieval evidence through the same workspace surfaces as other context records.

### Preserve producer-specific raw content while unifying derived inspection metadata
Managed transcripts, web captures, and message indexes do not need to share one raw file format. The consistency target is the derived inspection envelope that powers manifests, search, summaries, and thread grouping.

Alternative considered: force all producers into one canonical raw file layout. Rejected because it would create unnecessary coupling across otherwise distinct capture flows.

## Risks / Trade-offs

- [Normalization rules could accidentally flatten useful producer-specific nuance] -> Mitigation: standardize only shared inspection fields while leaving producer-specific raw metadata intact.
- [Legacy workspaces may still contain sparse metadata] -> Mitigation: normalize during rebuild and validate that missing fields degrade gracefully instead of breaking index generation.
- [Search behavior may shift when tags and summaries become more uniform] -> Mitigation: extend deterministic fixtures to confirm that retrieval and workspace inspection stay bounded and informative.

## Migration Plan

- Introduce shared normalization helpers for summaries, tags, and thread-linked inspection metadata.
- Update transcript, web-capture, retrieval-audit, and manual-save producers to use the shared rules for new writes.
- Apply the same normalization during manifest and index rebuilds for preexisting records without rewriting raw files.
- Refresh validation fixtures and assertions so mixed thread artifacts exercise the normalized inspection paths.
