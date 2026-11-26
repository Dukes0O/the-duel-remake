# OPEN-WRITE-4: Smoke over a friend when the enemy is the Ash Men, and the Grey Camp

Claude (cloud), 26 November 2026. Design: `docs/story/open-scablands.md` sections 18 and 21.

**Changed.** New page `docs/story/threads/burned-camp-ash-men.md`: the Ash Men's turn scene by scene, the Grey Camp, the
false trail's drive there, what Old Smoke says at the fifth night's parley, and its new names. New data
`src/story/threads/content/burned-camp-ash-men.js`, id `burned-camp`, holding only what differs, under
`when: {cast: 'enemy', is: 'ash-men'}`. Nothing loads it. Six picks are in `docs/board/questions/OPEN-WRITE-4.md`.

**Checks**, on commit 7db8cf0e5: `checkThread` on the file reports nothing; `node tools/thread-crossings.mjs --check`
says "No faults."; `tools/test-thread-shape.mjs`, `tools/test-board.mjs`, `tools/test-repo-hygiene.mjs` pass;
`npm run build` passes; the lane tier: running at the time of this commit; its result follows in the next commit. Every line, thought and mark sentence was checked by script against
the page, word for word, and against the sentence rule.

**Changed assertion.** `tools/test-thread-shape.mjs`: the new file's counts are added (69 lines, 34 thoughts, 13
questions, 16 choices), and the count of files goes from 9 to 10. A deliberate addition, as the test asks; nothing is
loosened.

**Removed.** Nothing. The card that folds this file into `burned-camp.js` deletes it.
