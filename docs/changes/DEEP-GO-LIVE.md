---
task: DEEP-GO-LIVE
status: review
flag: the-deep
---

# DEEP-GO-LIVE

## Design settled before code

Use the authored trail segment ranges, including ranges that cross index zero,
to identify each place. Emit `deepPlace` on entry; mark its first visit with
`title: true`. The App saves that place through the existing `rememberDeep`
helper. The HUD shows its name for 3 seconds using the existing title card and
holds Ana's captions until it clears. Saved places do not show a title again.
No save migration is needed: `places` is already optional and fixture 16
already contains all three place ids.

The card's four event cues take priority over the older four cue names in
THE_DEEP 10.1: sonar with a soft echo, rising fill hiss, short cancellation
hiss, and low bubbling surface rush. Author tones and filtered noise in the
sound bank, route through the Deep adapter and existing mixer. A lift uses
the event's fill time; cancellation or raising stops its hiss.

## Implementation and checks

- `tools/test-deep-story.mjs`: 9 tests pass. Added first entry, all three
  places, wrapped ranges, standing still, paused visits, saved visits, App
  persistence, three-second HUD timing and captions hidden during titles.
- `tools/test-deep-audio.mjs`: passes. Four synthesized cues reach the mixer;
  repeated event objects do not replay; cancel and raise stop the fill hiss;
  mute and switch-off start no story cues. Existing asset measurements pass.
- `npm run build`: passes (531 modules). Existing chunk-size and mixed
  static/dynamic-import warnings only.
- `node tools/run-browser-scenarios.mjs --scenarios deep-sirena,deep-life --jobs 1`:
  2/2 pass, 7 screenshots, zero warnings or console errors. Private QA
  ports, memory-only saves. Review evidence removed after recording results.
- Lane tier: initial run stopped at the historical P4 bank assertion and
  Git tar's Windows drive-letter failure in drive-through (47 passed, 2
  failed, 20 not run). Failed and remaining suites resume with Windows
  System32 tar first on PATH; both failures now pass. No passing suite is
  repeated, and no drive-through source or assertion changes.
  Final coverage: **69/69 selected suites passed**, no suites left unrun
  (47 original passes plus 22/22 follow-up passes; 219.06 s and 188.97 s).
  Commands: `node tools/run-tests.mjs --tier lane --changed --jobs 4`, then
  the same runner filtered to the two failed and twenty unrun suites only.
- Replay guard: 225 checks across 25 cases, 23 events, 9 categories, three
  frame rates and three runs pass without new fingerprints. World guard:
  47 exact scene checks across 20 events pass without new signatures.
  P4 native FIELD audio fingerprint stays
  `1f920ae3404d760c451374f9ffaf80f62d2aba979aa77b9539d295b20e217567`.
- Board validation: 191 checks pass. Session status snapshot refreshed in
  this lane, without reading the live checkout or updating `board.yaml`.
- Save reviewer ran `test-save-fixtures` (21 historical + 1 forged, 954
  checks), `test-deep-save` (29 groups), `test-career-budget` and
  `test-career-backup`: all pass. Largest ghost journal 2,500,604 / 4,000,000
  bytes. All legacy loads remain unchanged.

## Review

One independent save/code reviewer: review clear, including the test-only
four-cue exclusion correction. Existing optional
field normalization, player/run guards and backup-before-migration paths
remain intact. No new save version, payment, migration or backup is needed.
The App records only authored place ids for the player in this dive.

## Changed assertions

`tools/test-p4-audio.mjs`: extend the exact Deep cue exclusion list by
`deep.sonar`, `deep.liftbag`, `deep.lift-cancel`, `deep.raised`. These new
switch-gated cues are outside the historical pre-P4 bank. Both historical
hashes stay unchanged, and every previously pinned cue remains checked.
Claude's written review is required before integration under AGENTS 18.

No assertions removed or loosened. Added assertions in the existing story
and audio suites prove the new behavior. Fixture 16 already covers all
three `deep.places` ids; no fixture or roster-count change is needed.

## Removed

No old code, assets or tests replaced. No new runtime assets or dependencies.
The lane's generated build, QA bundle and browser evidence are recycled
after their results are recorded; no screenshots or gate logs are committed.

## Claude review (25 October 2026)

Approved: the four new switch-gated story cues join the existing Deep exclusion in `tools/test-p4-audio.mjs`; both historical hashes unchanged, every old cue still checked.
