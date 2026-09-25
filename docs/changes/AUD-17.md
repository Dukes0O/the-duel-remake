---
task: AUD-17
status: ready-to-merge
kind: candidates
flag: none
player_facing: no
---

# Raider and crew voice candidates

The requested candidate-only slice is complete: eight crew takes and two
raider alternatives, using exactly 400 ElevenLabs credits of the 1,500 ceiling.
No candidate is selected, rejected or kept. Runtime voice integration remains
outside this slice and awaits Kyle's casting decisions.

## Design and implementation

Use stock voices, short original lines and the existing multilingual-v2 path.
Reservations are persisted before generation; uncertain requests never retry
automatically. Resume validates the plan and saved receipts, skips completed
takes and keeps keep:false. Keys come only from Kyle's environment. No new
account, paid service or key file was created. The kept Callum source is intact.

Candidates: Rook/Harry, Nell/Alice, Jax/Liam, Odessa/Matilda, Cinder/Jessica,
Dune/George, Wren/Lily and Tusk/Bill; raider alternatives Harry and Bill.
Account usage rose from 180 to 580, leaving 9,420 at the final account check.
Exactly ten generations, no retries and no further calls planned tonight.

An account query returned HTTP 429 after four saved takes. Persistence-first
handling retained Odessa despite that follow-up error. Resume after backoff
skipped all four and made only the remaining six, paced 30 seconds apart.

## Tests and evidence

Five fake-only regressions preceded generation: hard budget and account balance,
resume, changed plan, uncertain result, post-generation accounting failure and
keep:false. All pass. Director approved the test hook; no runtime changes are
included. All ten hashes match receipts, all decode, and true peaks range from
-8.58 to -2.91 dBTP. These are dry casting auditions, not in-game balance tests.

Lines, roles, voices, levels and credit verdict are in
`docs/board/listening/voices/round-1.md`. Human scores remain pending.
Audition page: `.evidence/audio/voices/listen.html`.
Rebuild it locally with `node tools/audio/voice-listen.mjs`; no service call.
Ledger: `.evidence/audio/voices/aud-17-candidates.json`.

## Candidate custody and removed files

Nothing is selected or rejected; no take was promoted into audio-src/public.
The ten audition files and receipts are pending Kyle review, not consumed
review evidence. Preserve them and lane/audio/aud-10 until selected/rejected.
If the lane must retire first, the lane owner must transfer them to a named
integration ignored-evidence folder and verify hashes before cleanup. The
Director confirmed preservation; root will not read this external worktree.

## Removed

No candidate was removed. No kept source or runtime sound was replaced.

## Handoff gate

Integration/wasteland was merged at 9a11eab (integration parent 0b1af27)
before readiness. On that frozen source, lane tier with --changed --jobs 8
passed 262/262, zero failures or skipped suites, in 361.08 seconds. Production
build passed in 392 ms with the existing large-chunk advisory. All 162 replay
fingerprints are unchanged; all 48 expansion drives completed and won.
No assertion was relaxed. No simulation or save-format change is included.

Gate logs live in .evidence/2026-09-25/audio-ready/. The session-ending
`node tools/run-tests.mjs --tier full --jobs 8 --keep-going` runs on the final
ready-note commit; full.log and full-tier.json record that exact commit and
result. The Director merges the series; this lane never merges into integration,
pushes, edits live files, or updates board/status/run-log files directly.
