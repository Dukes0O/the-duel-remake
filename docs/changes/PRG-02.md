# PRG-02 — Notoriety XP and ranks

## Change

- Completed, feature-enabled Mad Max events award 10 XP per player hit, 150 per player-caused wreck, 100 for finishing and another 300 for winning. Completed losses keep action and finish XP. Ordinary races, time trials, practice, flag-off runs, timeouts and abandonment earn no Notoriety.
- Rank starts at 1. Moving from rank `n` to `n + 1` costs `400 + 150 × (n − 1)` XP, through rank 30. Saved rank is derived from saved XP on load. The new per-event result key under `profile.wasteland.settledResults` and the existing race settlement key prevent duplicate awards. Combat history stores the XP earned and resulting rank.
- Later on-foot systems can supply `result.notorietyEvents` entries with a unique `id`, `source: 'onFoot'`, `owner: 'player'`, and one of `onFootKnockdown`, `rpgDirectHit`, `footAmbushHit`, or `raiderKnockdown`. Their XP is 60, 40, 75 and 25 respectively. Duplicate, invalid, CPU-owned and car-sourced entries are ignored. The current generic `knockdowns` counter awards nothing, so unfinished on-foot features cannot create phantom XP.
- Count and XP bounds prevent malformed results from overflowing the save. No App or on-foot simulation file changed, so FOOT-02 can add the event records when its rules are ready.

## Checks

- `node --test tools/test-notoriety.mjs`: 7/7, including rank boundaries, actual App save/reload, double settlement, old profiles, invalid counters and future event filtering.
- `node --test tools/test-wasteland-profile.mjs`: 6/6.
- `node tools/test-save-fixtures.mjs`: 7 historical shapes, 247 checks.
- `node tools/test-progression.mjs`: 27/27; ordinary rewards and purchases retain their rules.
- `node tools/test-career-budget.mjs`: passed.
- `npm run build`: passed with the existing large-renderer-chunk warning.

No existing assertion or replay fingerprint changed. A browser scenario was skipped because the feature adds saved progression rules and has no new visible control. The on-foot XP types are a future integration contract; none is awarded by the current simulation.
