---
task: AUD-17
status: in-progress
kind: candidates
flag: none
player_facing: no
---

# Raider and crew voice candidates

## Design

Candidates only, never keep a take. Use stock ElevenLabs voices and the
existing multilingual-v2 path, with a hard 1,500-credit ceiling for tonight.
Choose short original lines for eight crew plus raiders, with text retained
as the proposed subtitle. One take per choice, no automatic retries. Budget
reservations are persisted before generation so an uncertain response cannot
silently spend again on resume. Existing gatekeeper source remains untouched.
Keys come from Kyle's environment only. Evidence takes and a usage ledger stay
in ignored .evidence; recipes and verdict summaries are the committed output.

## Tests and evidence

Write fake-only budget, resume and no-keep tests before the first generation.
This card does not enable runtime voices.

## Removed

Nothing selected or rejected yet. No take is promoted into audio-src or public.

## Candidate result

Ten candidates are saved: eight crew and Harry/Bill raider alternatives.
Account usage rose from 180 to 580: exactly 400 credits used, within the
1,500 ceiling. No further generation is planned tonight. No candidate was
kept, selected or rejected. The exact Callum source remains unchanged.

All candidate hashes match their receipts; all decode and their true peaks
range from -8.58 to -2.91 dBTP. These are dry casting candidates; no claim of
in-game balance or human listening is made. Text, voices, measured levels and
credit verdict live in docs/board/listening/voices/round-1.md. The local
listening page is .evidence/audio/voices/listen.html; rebuild it with
node tools/audio/voice-listen.mjs without service calls.

The first batch hit HTTP 429 on an account query after four saved takes.
The persistence-first fix preserved the Odessa take despite its follow-up
accounting error. After backoff, resume skipped all four and generated only
six more, with 30-second pacing. Exactly ten generations, no retries.
Five fake-only regressions pass, including budget overflow, insufficient
account balance, resume, changed plans, uncertain results, accounting failure
and the explicit keep:false contract. Director approved the test hook.
Lane/build gates after the latest integration sync remain pending; status is
in-progress while the audio foundation baseline remains unresolved.

## Final integration-synced lane gate

Merged integration/wasteland at 568f2dc. On that clean checkout, lane tier
passed 262/262 with no failures or skipped suites in 361.68 seconds; production
build passed in 363 ms. All 162 replay fingerprints remain unchanged, and all
48 expansion drives completed and won. The build retains the existing large
chunk advisory. No assertion was relaxed to obtain this gate.

The session-ending full command is
`node tools/run-tests.mjs --tier full --jobs 8 --keep-going`. Its log and exact
commit verdict are retained under .evidence/2026-09-25/audio-final/ as full.log
and full-tier.json. Those are review evidence, not generated files to commit.
No board, status or run-log file is edited directly by this lane.

Status remains in-progress. Passing general suites does not waive AUD-10's
strict waveform comparison or turn pending human ratings into approvals.

The ten unselected audition files and receipts remain pending Kyle review,
not consumed evidence. Preserve them until selected or rejected. If this lane
must retire first, transfer them to a named integration ignored-evidence
folder and verify their hashes before cleanup. Do not promote them into the
runtime or audio-src without Kyle's selection.
