# OPEN-WRITE-3: three storylines of the open Scablands, written in full

**Written.** `mall-road-toll`, `market-day` and `somebody-elses-flag`: each a page under `docs/story/threads/` in the
form of `open-scablands.md` section 21, and a data file of the same name under `src/story/threads/content/`. Nothing
loads the files yet; OPEN-THREADS will.

**Checks, on commit 5253d5a5f** (with `integration/wasteland` 0557e0b33 merged in). Each file loads by the card's
`node -e` line. `checkThread`: nothing for `market-day` and `somebody-elses-flag`; for `mall-road-toll` only the new
site `sumps-gate`, named three times until its row is in the register. `tools/test-board.mjs`: 720 passed.
`tools/test-repo-hygiene.mjs` and `tools/test-open-shared.mjs`: passed. `npm run build`: built. Every line was read
against the rules for the writing. A scratch script found every line of each page in its file word for word.

**Not run.** No lane tier: no game code changed. **Changed assertions.** None.
**New names for the register:** the site `sumps-gate`; the persons `nan-tallow`, `gasket`, `lug`, `miss-pell`.
**Questions, with my picks:** `docs/board/questions/OPEN-WRITE-3.md`.

**Removed.** Nothing: no released screen, job or rule is replaced.
