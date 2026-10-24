---
task: QA-TEST-AUDIT
status: review
kind: tooling
flag: none
player_facing: no
---

# QA-TEST-AUDIT: right-sized tests (24 October 2026)

Kyle: too many tests run too often, and many pin exact numbers that break on
every deliberate change. Built on `cloud/qa-test-audit` from
`integration/wasteland` (card `docs/board/cards/QA-TEST-AUDIT.md`). No game
code changed: only `tools/run-tests.mjs`, test suites, one replay control file
and docs. The audit table is `docs/board/checks/test-audit.md`; Claude's
answers to the questions are on the card.

## What changed

- **Measure.** `docs/board/checks/test-audit.md`: every suite's run time, its
  failures in the last 30 days (real fault, pin moved on purpose, tool or
  machine, red before code) and where it runs now. 639 failure incidents: 365
  pins, 129 red-first, 78 tools, 67 real faults (from 39 suites).
- **Lane selection** (`tools/run-tests.mjs`): `localDependencies` stops at a
  hub (`HUB_IMPORTS = 20` local imports; the hub itself still counts), and
  `SHARED_FILES` (busy-game-files lock plus `config.js` and `feature-flags.js`)
  select only their owners and text readers. The last twenty merges: lanes of
  144 to 406 suites (16 to 31 minutes) now run 27 to 101 suites (2 to 8
  minutes); docs-only lanes are unchanged. Table in the audit.
- **Full tier only:** nine slow suites with no real catch join
  `NIGHT_ONLY_SUITES`.
- **Fewer pins:** one reference per area for the save fixture roster, the
  switch list, the Scrapdome trace, the ordinary race fingerprints, the sound
  bank and catalog, and the car roster; the rest are behaviour checks.
- **Rules instead of lists** (Claude's answer 4): the helicopter import
  guard, the shortcut preset freshness hash and the circuit release orders.
- **Retired:** four suites that only tested other test tools.
- `docs/CODEX_PLAYBOOK.md` section 7 describes hubs, shared files and
  `NIGHT_ONLY_SUITES`. AGENTS.md rules 11 and 12 were updated by Claude on
  integration.
- Claude's answers are on the card; the question file was removed.

No game code changed. The one `src/` file touched is the generated
`src/generated-shortcut-presets.js`, rebuilt by its own generator: only its
`sourceFingerprint` string moved, and the game does not read it.

## Every removed, moved or loosened check

No check stops testing the behaviour its suite exists for. Each row says where
that behaviour is still tested.

**Lane selection (`tools/run-tests.mjs`)**

- A lane no longer follows imports through a hub (20 or more local imports)
  and does not select a suite for importing a shared file (`game.js`,
  `main.js`, `render3d.js`, `app.js`, `config.js`, `feature-flags.js`).
  Still tested: the smoke set and replay and world guards run in every lane;
  suites that read a shared file as text still run; the night full tier runs
  every suite. Claude agreed (card, answer 1).

**Moved to the full tier only** (`NIGHT_ONLY_SUITES`): `test-campaigns`,
`test-expansion-driving`, `test-opponents`, `test-crossbow-aim`,
`test-circuit-layouts`, `test-course-eligibility`, `test-ufo-landing`,
`test-terrain`, `test-grand-prix-existing`. Each takes 90 s or more and caught
no real fault in 30 days (numbers in the audit). Unchanged, they run every
night and before every release.

**Duplicate pins reduced to one reference**

| Suite | Removed or changed | Reason | Still tested by |
| --- | --- | --- | --- |
| `test-career-backup` | fixture count `=== 15` became "at least 15, every fixture backed up" | the same roster count was pinned in three suites (7 to 9 edits each) | `test-save-fixtures` (exact roster) |
| `test-arena-settlement` | fixture count `=== 15` became "at least 15, every fixture settles" | as above | `test-save-fixtures` |
| `test-wasteland-beta` | full switch dictionary became "the 16 Wasteland switches are on, career backup dev, course switches follow manifests, retired switches absent" | 23 edits in 30 days, one per new switch; it collided with integration while this card was built | `test-feature-flags` (complete list and count) |
| `test-arena-pit` | hash of `expected-fingerprints.json` removed | broke on every replay re-record; it hashes another test's file | `test-replays` checks those fingerprints itself |
| `test-salt-flats` | Scrapdome geometry and 8 s trace check removed; replay file hash dropped from the capture | identical code and expected values to `test-arena-pit` | `test-arena-pit` (also runs on Linux; this one needs the laptop) |
| `tools/replays/salt-flats-controls.json` | `ordinaryReplayFileSha256` field removed | no reader left | (as above) |
| `test-sal-fight` | ordinary-race fingerprint test removed | same inputs and expected values as `test-warlord-format` | `test-warlord-format`, `test-replays` |
| `test-side-saws` | ordinary-race fingerprint test removed | as above | `test-warlord-format`, `test-replays` |
| `test-fight-voices` | ordinary-race fingerprints became "the same race with the switch on and off is identical, it runs, and nothing is said" | keeps its own claim without a pinned number | exact fingerprints in `test-warlord-format` |
| `test-arsenal-core-audio` | sound bank, catalog, export and F1 voice hashes removed (with their exclusion lists and the old-flag reshaping) | each new cue edited three suites; these snapshots cover a subset of the cues `test-p4-audio` pins (checked: 72 of its 125) | bank and catalog: `test-p4-audio`; exports and F1 voice: `test-arsenal-wave1-audio` |
| `test-arsenal-wave1-audio` | sound bank and catalog hashes removed; the old-flag reshaping became a direct check that retired switches leave no `flag` field | subset of `test-p4-audio` (75 of 125 cues) | `test-p4-audio` |
| `test-armor-kit-assets` | car count `12` became "at least 12, every car checked" | the car count was pinned in six suites; one new car moved about 20 suites | `test-vehicle-assets` (exact roster) |
| `test-vehicle-paint` | car count `12` became "at least 12" (the list is built from `CARS`) | as above | `test-vehicle-assets` |
| `test-vehicle-grounding` | model count `12` became "at least 12" (built from `CARS`) | as above | `test-vehicle-assets` |
| `test-progression` | `CARS` total `12` and medal-car count `3` became "2 starters + 6 priced + 1 completion reward + the medal cars = every car", at least 3 medal cars | as above; the new form also proves every car can be earned | `test-vehicle-assets`, `test-medals` |

**Lists turned into rules** (Claude's answer 4)

- `test-heli-mode`: the list of 36 approved file pairs (12 edits in 30 days) became a rule. In the
  game, only `app.js` (the hooks), `progression.js` (`heli-save` only),
  `sound-bank.js` (`heli-audio` only), `screen-readiness.js` (`heli-jobs`
  only), `src/lab/lab-heli.js` (flight, bucket and cable numbers) and
  `src/lab/lab-lessons.js` (`heli-save`) from LAB-RULES, and `render3d.js` and
  `screen-router.js` (drawing files only) may
  name a helicopter file; pages may not. Tools, tests and browser scenarios
  are no longer scanned: they are not the game. Loosened on purpose: a new
  hook in `app.js` or a new tool reading a helicopter file no longer needs an
  edit here. Checked: a stray import in `screen-menu.js` or a rules file in
  `render3d.js` still fails. The second guard (rules files import only
  helicopter rules) is unchanged.
- `test-shortcut-presets` freshness: `tools/shortcut-preset-freshness.mjs` now
  hashes `buildShortcuts` and every top-level function, constant and `Course`
  method it reaches by name (29 declarations), plus `rng.js` and the cache, instead
  of whole stretches of `course.js`. Checked: an edit to an unrelated method
  keeps the hash; an edit inside the solver changes it. The stored
  `sourceFingerprint` in `src/generated-shortcut-presets.js` was regenerated
  with `node tools/generate-shortcut-presets.mjs`; all 15 layouts are
  byte-identical (only the freshness string moved, which the game never reads).
- `test-circuit-layouts`: the Summit Attack row's pinned state `on` and
  release order `6`, and the five podium children's pinned orders 7 to 11 and
  state `dev`, are now read from the manifests, with new checks that the
  manifests are in release order, each order is unique and a child is
  released after its parent.

**Retired** (only tested other test tools)

- `test-audio-crash-meter`: tested the audio meter inside the
  `audio-crash-peak` browser scenario. That scenario fails loudly if its meter
  breaks.
- `test-arsenal-audio-recorder`: tested the capture witness and recorder of
  the Arsenal audio scenario.
- `test-launcher-test-listen`: tested `listenPrivate`, a helper only
  `test-launcher-port` uses; that suite still exercises it.
- `test-rustwall-baseline`: pinned the synthetic inputs of
  `test-rustwall-frame`, another test.

Kept on Claude's word: `test-test-runner`, `test-browser-harness`,
`test-browser-scenarios`, `test-full-check`, `test-build-status`, `test-board`,
`test-repo-hygiene(-rules)`. The Rook and Rustwall P2 suites stay in the full
tier.

## Changed assertions (for Claude's review)

All listed above. No tolerance was widened. Count pins became "every item,
none skipped" where the exact count is still pinned once elsewhere; snapshots
were removed only where another suite pins a superset (checked by comparing
the cue sets: 72 and 75 of `test-p4-audio`'s 125).

## Checks

- Full tier before (on `04770cec`, Linux, `--jobs 4 --keep-going`): 472
  tasks, 452 passed, 20 failed, 0 not run, 2,160 s.
- Full tier after (on `2d205365`, same settings): 473 tasks, 453 passed, 20
  failed, 0 not run, 2,010 s. The same 20 fail before and after, all for the
  machine, none for an assertion: Blender, the art library on `C:`, the
  Windows Recycle Bin, `pwsh`, Chrome or the cloud's signed git commits
  (`test-compact-binaries`). The list is in the audit, "Cannot run on Linux".
  **The laptop must run these 20**, especially `test-salt-flats` (edited
  here, needs Blender and the art library).
- Each edited suite also passed alone: `test-test-runner` (with new checks for
  hubs, shared files and owners), `test-wasteland-beta`, `test-feature-flags`,
  `test-arena-pit`, `test-sal-fight`, `test-side-saws`, `test-fight-voices`,
  `test-warlord-format`, the three audio suites, `test-progression`,
  `test-vehicle-paint`, `test-vehicle-grounding`, `test-armor-kit-assets`,
  `test-heli-mode` (plus a stray-import check that fails as it should),
  `test-shortcut-presets`, `test-circuit-layouts`.
- Lane tier: this card edits `tools/run-tests.mjs`, so its lane selects every
  suite but the full-tier-only ones (448 suites, `--list`); the full tier
  above covers it. After it only docs changed (rule 19), so
  `test-board`, `test-repo-hygiene`, `test-repo-hygiene-rules`,
  `test-build-status` and `test-test-runner` ran again: 6 passed (with
  `test-build-update`), 0 failed.
- `npm run build`: built (the usual large-chunk notice).
- Integration merged in a second time (LAB-RULES, MAP-ART, DRIVE-LESSON-4):
  the conflicts were exactly the pins this card removes (save roster 15 to 16
  in `test-career-backup` and `test-arena-settlement`, two new switches in
  `test-wasteland-beta`, new Lab entries in the `test-heli-mode` list, which
  became two hook lines in the rule). All 25 suites this card edits, plus the
  replay guards, ran on the merged tree: 25 passed, 1 failed
  (`test-salt-flats`, art library on `C:`, laptop only). Build passed again.
- Not run here: browser scenarios, frame checks and the 20 laptop-only suites
  above.

## Removed

- `tools/test-audio-crash-meter.mjs`, `tools/test-arsenal-audio-recorder.mjs`,
  `tools/test-launcher-test-listen.mjs`, `tools/test-rustwall-baseline.mjs`.
- `docs/board/questions/QA-TEST-AUDIT.md` (answers moved to the card).
- The duplicate pins and snapshot helpers listed above, and the
  `ordinaryReplayFileSha256` field of `tools/replays/salt-flats-controls.json`.
