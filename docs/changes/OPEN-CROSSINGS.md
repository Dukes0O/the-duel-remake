# OPEN-CROSSINGS

Built `tools/thread-crossings.mjs` (no dependency beyond Node) and `tools/test-thread-crossings.mjs`. The tool loads every
storyline in `src/story/threads/content/` (or `--dir`), and prints: each storyline's `checkThread` sentences; the table of
reads and writes found by walking the file; the crossings (writer, the fact, reader), the marks read and never written, and
the facts written and never read; and a walk of beats and ends with no graphics. `--html [file]` writes one standalone page
(inline SVG ring, light and dark, no script), by default `.qa-dist/thread-crossings.html`. `--check` exits 1 on a
`checkThread` failure, a walk fault or a file that does not load.

Checks, on `83ffb4b0d` plus this card's two files (nothing else changed): `test-thread-crossings` ok; `test-open-shared` ok;
`test-repo-hygiene` ok; `npm run build` ok; lane tier (`--tier lane --changed --jobs 2`): everything passed except
`tools/test-full-check.mjs`, which fails the same way without this card (`spawnSync pwsh ENOENT`: it needs the laptop's
PowerShell; a laptop-only suite). Left to the night: `tools/test-first-person-polish.mjs`. Not run here: frame check
(nothing a player can reach). No assertion changed. Real storylines: see the pull request.

Where the walk goes beyond the card's wording, and why: `docs/board/questions/OPEN-CROSSINGS.md` (delete it with this note
when the card merges).

**Removed:** nothing. This replaces no job, rule or screen.
