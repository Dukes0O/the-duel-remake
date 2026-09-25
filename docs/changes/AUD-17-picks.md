---
task: AUD-17
status: ready-to-merge
kind: art
flag: wasteland2
player_facing: no
---

# Kyle's voice picks, and the new art approach (25 September 2026)

## What changed

- Kyle kept all eight crew voice candidates and chose **Bill** for the raiders
  ("Harry's voice is too wispy and breathy"). Kept with
  `elevenlabs.mjs keep-take` (no new credits) into `audio-src/voices/`:
  `crew-<name>-callout.mp3` for Rook (Harry voice), Nell (Alice), Jax (Liam),
  Odessa (Matilda), Cinder (Jessica), Dune (George), Wren (Lily), Tusk (Bill),
  and `raider-toll.mp3` (Bill). Each is recorded in `tools/audio/catalog.json`.
  The rejected Harry raider take was deleted. Wiring these cues into the game
  (crew callouts, raider warnings, subtitles kept) remains AUD-17's runtime work.
- SPEC 0.11: art now starts from existing assets instead of from-scratch
  Blender sculpting, with a three-round quota guard per card per run.

## Evidence

- Placement check, lane tier and production build: see the commit that adds
  this note.

## Removed

- The unselected raider take in Harry's voice.

## Behavior and test changes

None. No game code changed. Finding for the Director: `tools/test-rustwall-frame.mjs`
looks up the commit `5a994ad` with `git rev-parse`, so it fails in a copy
without that history and will break the first time CLEAN-10 compaction
rewrites commit IDs. It should read its baseline from a checked-in fixture.
