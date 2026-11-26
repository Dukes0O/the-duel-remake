# OPEN-WRITE-3: three storylines of the open Scablands, written in full

**Written.** `mall-road-toll` (A toll on the Mall Road), `market-day` (Market day) and `somebody-elses-flag`
(Somebody else's flag): each a page under `docs/story/threads/` in the form of `open-scablands.md` section 21, and a
data file of the same name under `src/story/threads/content/`. Nothing loads the files yet; OPEN-THREADS will.

**Checks, on commit 87eda7c72.** Each file loads by the card's `node -e` line. `tools/test-board.mjs`: 727 passed.
`tools/test-repo-hygiene.mjs`: passed. `npm run build`: built. Every line was read against the rules for the writing,
and fifteen were mended. A scratch script compared each page with its file: every line on a page is in its file word
for word, no line is over 260 characters, no file names another storyline, and every mark begins with its own id.

**Not run.** `checkThread`: `src/world/open/check-tables.js` was not on `origin/integration/wasteland` (still at
7eec2f954) when the pages were done. No lane tier: the card names none, and no game code changed.

**Changed assertions.** None.

**Questions, with my picks:** `docs/board/questions/OPEN-WRITE-3.md`.

**Removed.** Nothing: no released screen, job or rule is replaced.
