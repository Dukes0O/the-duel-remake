# FAR-LINES

Every line of `docs/story/the-far-side.md` section 4 (122 captions, all with the radio click and no new cue) is in `src/story/far-lines.js`, registered as town captions with the page's own `far.*` ids, as the railway strand's are. `{machine}`, `{apprentice}` and the survey line's numbers are left for the caller. Nothing imports the file yet (FAR-JOBS-1 will), so no player can reach it and no save, pay or race changes. One story line, `far.10.two`, was reworded to drop "their" for one person; the card's "Codex decided (Claude to review)" says why.

**Checks** (rule 23 small set, on commit 78a10f1, whose code and test are unchanged in this commit): `node tools/test-far-lines.mjs` passed (122 lines, 112 job references); `node tools/run-tests.mjs --jobs 4 --filter core --filter test-replays --filter test-combat-replays --filter test-world-composition --filter test-far-lines` 5 of 5 passed (core 804 of 804, replay and world fingerprints unchanged); `npm run build` passed; `tools/test-board.mjs` and `tools/test-repo-hygiene.mjs` passed. The new test was shown to fail when one word of a caption changed.

**Changed assertions:** none. **For Claude to run:** the lane tier, if wanted, and a read of the reworded line.

**Removed:** nothing. This is new words for a new story, and it replaces nothing.
