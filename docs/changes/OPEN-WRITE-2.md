# OPEN-WRITE-2: three storylines of the open Scablands, written in full

- **What changed.** New pages `docs/story/threads/radio-hill-voice.md`, `lights-on-the-whites.md` and `runaway.md`, each
  in the form of `open-scablands.md` section 21, and their data files under `src/story/threads/content/`. Nothing
  loads the files yet (OPEN-THREADS will), so no released behaviour moves. Board: the card claimed.
- **Checks,** on the commit that carries this note, with `origin/integration/wasteland` at 0557e0b33 merged in: each
  file loads; `checkThread` reports nothing for `runaway` and one thing each for the other two, the new sites
  `the-pocket` and `bell-buoy`, which Claude adds to the register at the merge; `node tools/test-board.mjs`,
  `node tools/test-repo-hygiene.mjs` and `npm run build` (results in the pull request). A scratch check, not committed,
  compared every line both ways between each page and its file: 163, 129 and 160 strings, none differing, none over
  260 letters, no em dash. Every line was read against the card's rules for the writing.
- **Not run here:** nothing a laptop must run; no suite reads these files.
- **Changed assertions:** none. **Race fingerprints:** not touched.
- **New names for the register** are listed in section 10 of each page. Seven questions with their picks are in
  `docs/board/questions/OPEN-WRITE-2.md`.
- **Sound cues** are named on each page, section 9.
- **Removed:** nothing. No job, rule or screen is replaced.
