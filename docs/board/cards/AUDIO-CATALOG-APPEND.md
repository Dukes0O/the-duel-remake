# AUDIO-CATALOG-APPEND

The short board entry controls current state, ownership, dependencies and locks.

Claude, 15 October 2026 (found in DRIVE-LESSON-LINES).

`addCatalogEntry` in `tools/audio/sourcing.mjs` sorts the whole
`tools/audio/catalog.json` every time it saves. The catalog is not sorted, so
recording one new voice line or fetching one library sound reorders every
row, and the tests that pin the old rows (`test-p4-audio`,
`test-arsenal-core-audio`, `test-arsenal-wave1-audio`) fail. DRIVE-LESSON-LINES
had to restore the order by hand.

Change: a new entry is appended at the end; an entry that replaces an
existing one (same source, key and cue, a missing cue counting as none)
takes that row's place; one library sound may serve several cues. No other row
moves and the file keeps its format.

Owns: `tools/audio/sourcing.mjs` (`addCatalogEntry` only),
`docs/changes/AUDIO-CATALOG-APPEND.md`.
Hooks: `tools/test-audio-sourcing.mjs` (new checks only).

Acceptance: a test shows adding an entry leaves every existing row and its
order byte for byte, appends the new row last, and replaces a same-key row in
place; `tools/audio/catalog.json` is unchanged; lane tier, build, one review.
Removed: the sort in `addCatalogEntry`.
