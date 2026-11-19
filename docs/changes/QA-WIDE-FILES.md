# QA-WIDE-FILES

- What changed: nine course tables and small helpers join `SHARED_FILES` in `tools/run-tests.mjs` with the owners in
  the Director's ruling of 19 November 2026 (in the card): `circuits/index.js`, `freestyle-course.js`,
  `bowl/bowl-course.js`, `expansion-courses.js`, `circuit-manifests.js`, `summit-attack.js`, `wasteland-access.js`,
  `wasteland-tuning.js`, `arsenal/targeting.js`. `progression.js`, `rng.js`, `course.js`, `combat-weapons.js` and
  `drivers.js` stay ordinary files. `docs/CODEX_PLAYBOOK.md` section 7 says so.
- New check in `tools/test-test-runner.mjs`: each of the nine selects its existing owners and fewer than 60 suites; each
  of the five stays out of `SHARED_FILES` and still selects a suite that imports it. The existing owner check now shares
  one dependency walk (same assertion). No assertion changed.
- Lane plan for one changed file, before and after (runner's own count): `bowl/bowl-course.js` 277 to 24,
  `circuits/index.js` 302 to 42, `progression.js` 220 to 220. Recent cards: EIFEL-CROWN-C2 359 to 81, MAP-SECRETS 244
  to 181, FIX-MANIFEST-AWAIT 271 to 177; STORY-REPLAY-PICK, EASY-NO-PENALTY and ROAD-RIDERS unchanged.
- Checks on this commit's tree (parent `0eb4b6bc0`): `test-test-runner` (266 checks), `test-build-status`,
  `test-integrate-lane`, `test-repo-hygiene-rules`, `test-full-check` passed; lane plans printed with the runner.
- Review (one independent subagent): no fault in the picking. It found `test-bowl-show` in the Bowl's draft owners,
  though it reaches no Bowl course file; it is left out of the list, so the Bowl has three owners. It also found a
  condition in the new check that could never fail; it was removed.
- Not run, by the Director's ruling: the lane tier. A change to `tools/run-tests.mjs` picks every short suite; tonight's
  night check is a full one and runs every suite, and the laptop is short of memory. No build: no file the build reads
  changed.
- Removed: nothing; the runner keeps one table and gains nine rows.
