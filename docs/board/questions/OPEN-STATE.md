# OPEN-STATE save decisions

## Roaming before the first story ledger

The Story Wall offers roam to players who have never banked Night 2. OPEN-SHARED starts those players at night 1 with no stocks. OPEN-STATE would save that ledger. Night 2 starts at night 2 with four embers and requires the saved ledger to be on night 2 before it can apply a choice or bank.

With the in-memory `water-qa` profile from `24-story-water.json` and seed 1234, `settleNight2` banks to night 3 today. After saving the initial roam ledger with the existing `beginLedger`, the same completed chapter fails with “That night has already changed.” Even a roam with no choices would cause this.

- Keep roam available before Night 2 and approve a shared opening ledger. Use Night 2's seed, night and starting stock when no ledger exists, then start an unbanked Night 2 from that same ledger so its rules see any roam changes. Extend the card to own the Night 2 start hook and add a regression for roam, bank and replay in order.
- Require the first banked Night 2 before roam becomes available. This keeps the current Night 2 save flow but changes Story Wall admission and when those players can explore.
- Keep pre-Night-2 roaming temporary and defer its ledger write. This needs a ruling on which decisions survive leaving a roam and how the single ledger gets them.

Recommended: the shared opening ledger. It keeps the current roam entry and the design's freedom to explore before answering a story marker. Please settle the opening and approve the Night 2 hook before implementation.

## Historical fixture roster

The required new JSON fixture under `tools/fixtures/saves/` changes the exact roster count in `tools/test-save-fixtures.mjs` from 26 to 27. The recut does not name that test for edits. Please grant the one-line roster hook and review the changed assertion, keeping every historical fixture and its checks. The alternative is a test-local fixture in a subdirectory, which the historical runner would not see. Recommended: grant the roster hook.
