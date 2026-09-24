# SAVE-01 — combat credit bonus

## Change

- A completed Mad Max race with `wasteland2` enabled earns 10 credits per player hit and 100 per player-caused wreck. The combat bonus is capped at 25% of the chosen CPU difficulty's base win reward.
- Manual/Pro doubles the capped bonus through the existing recurring-bonus rule. A completed loss can earn the bonus. Combat losses, timeouts and abandonment never debit saved credits; timeouts and abandonment earn no combat bonus.
- The values live in `COMBAT_TUNING.creditBonus`. The App passes its actual Wasteland switch to settlement. Result screens name the bonus and describe the safe wallet.
- Stat counts must be nonnegative safe integers. Old save shapes and settlement keys stay unchanged. Ordinary and flag-off races retain their prior reward and loss-charge behavior.

## Checks

- `node --test tools/test-combat-credit-bonus.mjs`: 6/6. Covers capped wins, Manual/Pro, completed losses, timeout, abandonment, invalid counts, flag-off/ordinary behavior, normalized history, one-time settlement, the real App save path and result label.
- `node tools/test-progression.mjs`: 27/27.
- `node tools/test-progression-integration.mjs`: 141 assertions.
- `node --test tools/test-combat-scoring.mjs`: 15/15.
- `node tools/test-save-fixtures.mjs`: 7 historical shapes and 246 checks.
- `node tools/test-career-budget.mjs`: passed.
- `npm run build`: passed. Existing large-renderer-chunk warning remains.

No existing test assertions or replay fingerprints were changed. A browser scenario was skipped because the reward and result markup were covered by the focused App test. The full release gate belongs to integration.
