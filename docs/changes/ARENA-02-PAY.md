---
task: ARENA-02-PAY
status: ready-to-merge
kind: feature
flag: scrapdome
player_facing: yes
---

# Last Car Rolling settlement (26 September 2026)

## Design

The exact formula is settled before code in `docs/board/decisions.md`: 80 scrap
for finishing, 40 per computer car placed behind the player and 60 per
credited wreck, capped at four. Multiply the subtotal by computer difficulty
(1.0, 1.2 or 1.4) and round once. A win against at least two computer cars
adds 25 Kettle Kingpin hold. A one-car win pays scrap only.

Settlement belongs to the named player who started the event. It runs once on
`arenaResult`, records `arena:<runId>` in the version-1 Wasteland career and
reverts the whole profile if storage rejects the save. Leaving before a result
does not settle anything. Independent review re-sliced the card to
`src/progression.js` after proving that the existing current-version normalizer
dropped unknown root profile fields on the real save path. The added contract
preserves those fields while keeping known-field validation and future-schema
write refusal unchanged.

## Tests first

`tools/test-arena-settlement.mjs` first failed because the settlement module
did not exist. Its new checks cover the exact formula, wreck cap, all three
difficulty factors, one-car and larger-field hold rules, duplicate events,
starting-player identity, abandonment, failed-save rollback, result metrics,
unknown fields and all seven historical save fixtures.

Before runtime code was committed, three new test setup assertions were
corrected: the medium two-opponent example is 336 scrap, the synthetic event
must leave its start countdown, and the integration fixture must explicitly
select Medium. No existing assertion changed. Independent review then added a
real `replacePlayerProfile` / `savePlayers` / `loadPlayers` regression. It
failed with the unknown root field missing before the normalization fix and
passed after it.

## What changed

- `src/arena/arena-settlement.js` validates the completed Scrapdome event,
  computes the bounded award, records `arena:<runId>` and updates Kettle hold
  without touching racing credits.
- `src/app.js` accepts only the current event and starting player, refreshes
  that player, saves once and restores the prior profile on failure. Duplicate
  events keep the original result presentation without paying again.
- `src/screen-arena.js` shows `SCRAP EARNED` and `HOLD` on the result screen.
- `src/progression.js` preserves additive unknown root fields for supported
  profile schemas. It still validates every known field and removes the three
  retired root fields (`weapons`, `awardedWins`, `lightingMood`) after their
  established migrations.

## Evidence

- Focused settlement: 9/9.
- Arena event and UI: 12/12 and 6/6.
- Historical saves: seven shapes and 247 first-load/round-trip checks.
- Wasteland profile: 6/6; career backup: all seven fixtures; career storage:
  3.47 MB of 4.00 MB; maximum ghost journal 2,500,604 of 4,000,000 bytes.
- Progression: 27 checks; lighting integration: 141 checks with unchanged
  trajectory fingerprint `2351cf5c7fd3c3a33c2587680c897e3d5a18e08da69d8ce22727a0158d26aa10`.
- Audio: 460 actual-PCM checks passed with the configured FFmpeg decoder; no
  listening claim.
- Build: 236 modules. Final lane gate and independent corrected-candidate
  verdicts are recorded in the merge commit.

## Removed

Nothing. This card adds the first Scrapdome settlement path. Retired root
profile fields remain removed by their existing migrations.
