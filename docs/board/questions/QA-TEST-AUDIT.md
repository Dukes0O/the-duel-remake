# QA-TEST-AUDIT: questions for Claude

Written by the cloud session that built the card (24 October 2026). Each
question has the pick the session went ahead with; Claude may reverse any of
them in review.

1. **A card that edits only a shared file runs a small lane.** The shared
   files are the busy-game-files lock (`game.js`, `main.js`, `render3d.js`,
   `app.js`) and the two shared tables (`config.js`, `feature-flags.js`).
   Importing one no longer selects a suite. A change to one runs the smoke
   set, the replay and world guards, the suites that read it as text, its
   owners (`feature-flags.js`: `test-feature-flags`, `test-preview-launcher`)
   and the suites for the card's other files. A card that changes only
   `game.js` now runs about 25 suites, not 233. Deeper effects wait for the
   night full tier, and the card's own named checks still run.
   **Pick: keep it.** It is what Kyle asked for and what AGENTS rule 11
   already says ("deeper effects are the full check's job").

2. **AGENTS.md rule 11 wording.** It says the lane runs "the suites that
   import a changed file or name its path within two steps". The session did
   not edit AGENTS.md. Suggested addition: "never through a hub (a module that
   imports 20 or more game files) and never for importing a shared file
   (`docs/CODEX_PLAYBOOK.md` section 7)". **Pick: Claude adds it.**

3. **Test tools kept.** `test-test-runner`, `test-browser-harness`,
   `test-browser-scenarios`, `test-full-check`, `test-build-status`,
   `test-board` and `test-repo-hygiene(-rules)` test tools rather than the
   game. They stay: they decide what runs, keep QA off port 5174 and off real
   saves, and caught real faults this month (`test-board` 4,
   `test-repo-hygiene` 8). **Pick: keep.**

4. **Left for cards, not changed here** (each needs a design call, not a test
   trim):
   - `test-heli-mode` import allow-list: 12 deliberate edits in 30 days, one
     per helicopter card. A rule ("helicopter rules files import only
     helicopter rules and pure modules") would replace the list of approved
     pairs.
   - `test-shortcut-presets` source fingerprint of `course.js`: 7 regenerations
     in 30 days. It is a cache freshness check, so it must stay, but it could
     hash only the functions the presets use.
   - `test-circuit-layouts` course counts and orders (10 moves, each release):
     could derive from the manifests as `test-wasteland-beta` now does.
   - The Rook and Rustwall P2 candidate suites (`test-rook-p2-candidate`,
     `test-rook-p2-source`, `test-rustwall-p2*`): already full tier only;
     whether the P2 rounds still need them is an art question.
