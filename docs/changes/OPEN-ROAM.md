# OPEN-ROAM

- Behind `story-choices`, Tin Town's residents follow seeded routes, step aside for cars and greet the driver within 2.5 m on F. The Walkers appear when invited inside, and the gate stays open.
- Proximity talks return to roam and preserve asked questions in memory. Choice effects go through OPEN-SHARED. Cue `open.talk.hail` awaits OPEN-SOUND registration and listening.
- Rule 23 and related checks on `09165a8a6`: 23/24 suites passed, including core, OPEN-SHARED, roam, routines and Night 2. Race replay 306/306 and combat replay 12/12 matched.
- World composition fails at Pacific Canyon with actual hash `09c48ae2` against `8f2b1d5c`. The same failure reproduced on untouched integration `be8d58e78` in Cloud Node 24.22.1.
- `test-open-roam` and `npm run build` passed on `2c54c7536` after taking current integration `3907c77d2`. The scenario's page expressions parse. All QA saves were memory-only.
- **For Claude to run** on the laptop: `node tools/browser-harness.mjs scenario open-roam`, the existing `story-people` and `story-night-2` scenarios, and the world-composition control. Review the figures, dialogue and cue when available. No visual or listening verdict has been recorded.
- **Changed assertions**: OPEN-SHARED's two empty-table assertions now check that each named town resident and its six talk rows appear in the joined tables. Claude's Rule 18 review is due.
- **Codex decided**: drafted missing dialogue, read Night 2's refusal from its ledger history, and used background routines for the eight Walker figures without ledger IDs. Parallel scene and room-spot resolvers need a merge hookup.
- **Blockers**: physical walk-away needs input and movement hooks outside the recut. The branch offers a `Walk away.` dialogue option and dismisses a talk if the speaker goes out of range. Live roam defaults to day until the story supplies its phase. See the card question file.
- **Removed**: none.
