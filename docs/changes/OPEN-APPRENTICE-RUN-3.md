# OPEN-APPRENTICE-RUN-3

- With `story-choices` on, an unreadable registry keeps earned scrap and feud in the session, including on return to the yard.
- The result retries the same award. Before Night 2, **Drive Another Run** saves first and starts the next run after the write succeeds.
- Both result retry and a later yard save require the same active player and the last verified saved profile.
- **Removed** the payout refusal when storage could not be read and the immediate restart after a pre–Night 2 denied write.
- Node `22.23.5`, memory-only. Four new regressions failed before the fix. Apprentice passed 21/21, Gas Run 9,288, save fixtures 1,145 and Ember side jobs 221 on `64434a2d6`.
- Ordinary lane on `64434a2d6` passed 28/29. Preview Launcher reports one failure in 23 checks because its URL omits `bowl-rex-3`. The same failure reproduces on integration `710be0c6f` and the integrated card `7e8219638`.
- Nine integrated checks passed on `7e8219638`, including the card checks, browser readiness 18/18, race replay 306, combat replay 12 and world composition 65. The build passed with the mixed-import and chunk-size warnings.
- Existing assertions and replay and composition pins stayed in place. The player default for `story-choices` remains off.
- For Claude, the independent save and reward review, memory-only browser scenarios, selected laptop suites, Windows line-stamp fixtures and merged build are listed in the PR.
