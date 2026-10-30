---
task: KOGANE-RELEASE-SWITCH
status: ready-for-release-review
kind: release
flag: kogane-pass, kogane-pass-night, kogane-pass-reverse, nissan-skyline, kogane-invitation
player_facing: yes
---

# Kogane Pass, its two versions, the Skyline and the Kogane Invitation switched on (29 October 2026)

Prepared on `claude/kogane-switch-on` as a separate commit set for Claude to review and merge.
Nothing is merged, pushed or released here, and no frame timing was run.

## What is switched on

Five words changed in four files, all from `dev` to `on`:

- `src/circuits/kogane-pass.js`: the manifest state. Kogane Pass keeps its price of 2,200 and its release order of 13.
- `src/circuits/kogane-pass-night.js` and `src/circuits/kogane-pass-reverse.js`: `state: 'on'` passed to the variant helper. Both stay free (price 0) and are found from the helicopter over Kogane Pass, as the course packet says.
- `src/feature-flags.js`: `nissan-skyline` and `kogane-invitation` are `on`. The Skyline's switch is written twice in that table (an old duplicate line); both now say `on`, so the table is consistent. The Skyline goes live hidden (it needs `unlockRequirement: 'kogane-duel'`, which is already merged), so turning both on together is the order the story packet asks for (section 14, and "Decided 29 October").

Left as `dev`: `menu-front-door` and every other development switch.

`start-preview.bat` needed no change. It still lists `nissan-skyline` and `kogane-invitation` among its flags (a switch that is already on is harmless there, as with `pilot-map`), and the Kogane course flags are read from the manifests by `tools/preview-flags.mjs`. `test-preview-launcher.mjs` passes.

## Fixtures refreshed, and why

Only what the switch-on requires. Every existing signature, ground-row hash and replay fingerprint stayed identical (proved, see below).

| Fixture | Change | Why |
| --- | --- | --- |
| `tools/fixtures/world-signatures/kogane-pass.json` | new | Kogane Pass had no signature because it was dev. First capture at switch-on. |
| `tools/fixtures/world-signatures/kogane-pass-night.json`, `kogane-pass-reverse.json` | none | Captured by the versions card; the scene is unchanged, so the ordinary comparison now runs and passes. |
| `tools/fixtures/ground-rows-hashes.json` | three entries added (`kogane-pass`, `kogane-pass-night`, `kogane-pass-reverse`) | The ground-rows suite walks every listed course and looks each one up; the versions card said these are added at switch-on. The other entries are byte-identical. |
| `tools/replays/courses/kogane-pass.json` | new (one duel case, `falcone_f42`, fingerprints at 30, 60 and 144 frames a second) | Every course in the list needs one primary replay case. |
| `tools/replays/courses/kogane-pass-night.json`, `kogane-pass-reverse.json` | none | Their cases already existed; they load once the courses are in the list, and the recorded fingerprints still match. |

Proof nothing else moved: `node tools/test-replays.mjs --record` rewrote the fingerprints and `git diff` showed no change to any existing file, only the new `kogane-pass.json`. A full scene capture (`test-world-composition.mjs --capture`) compared with the stored signatures gave 30 identical and 1 new (Kogane Pass). `test-ground-rows-exact.mjs --record` changed no existing line.

Counts that moved because the courses are on: the course list goes from 28 to 31 entries, replay cases from 30 to 33, world signatures from 30 to 31 files.

## Changed assertions (reviewed)

Each moves because the courses or switches are now on. None is loosened.

- `tools/test-feature-flags.mjs`: `nissan-skyline` and `kogane-invitation` move from the list that must be `dev` to the list that must be `on`; the message names them as released on 29 October. The total count of switches does not change (the Skyline's duplicate line is still one key).
- `tools/test-map-secrets.mjs`: the manifest check expected the Kogane two to be `dev` and the other five `on`. It now expects all seven `on`, free, found from the air.
- `tools/test-map-view.mjs`: (a) the chart now shows every place but the Table, plus Kogane Pass (`PLACES.length - 1 + DEV_PLACES.length`; Kogane joins the chart through the `kogane-pass` switch, which is on); (b) the secret courses following their switches are all seven, not five.
- `tools/test-course-access.mjs`: the zero-price list also names `kogane-pass-night` and `kogane-pass-reverse` (seven secret courses). Kogane Pass itself is priced, so it is not in that list.
- `tools/test-skyline-handling.mjs`: the suite used to prove the Skyline is absent in the ordinary game, then re-run itself in a second process with the switch forced on. The Skyline is now in the ordinary game, so the "absent" proof and the second process are removed and the same checks run once, directly. Every other assertion in the file is unchanged and still runs. The "Skyline switched off hides the car" case is no longer testable through the module-level car table because nothing can turn a switch off in that process; `test-feature-flags.mjs` still covers the on and off states of the switch itself.

## Checked and needing no change

`test-circuits`, `test-world-composition`, `test-ground-rows-exact`, `test-campaigns`, `test-opponents`, `test-circuit-layouts`, `test-preview-launcher`, `test-reference-laps`, `test-replays`, `test-save-fixtures`, `test-story-hooks`, `test-story-kogane-duel`, `test-heli-story`, `test-drive-lessons` pass with no edit.

## Tests

See the hand-off report for the lane tier, the build and the by-hand suites. No frame timing was run (AGENTS rule 9 and the packet: the Night version's frames belong to the course release).

## Not done here

- No look check in the game and no frame check for Kogane Pass, its two versions or the Skyline in a field. Both belong to Claude's release step.
- The Kogane place still reaches the pilot's map through `DEV_PLACES` and the `kogane-pass` switch (the way Summit Run did). It works now the switch is on; moving it into `PLACES` would change the leg table for switched-off games and is a separate tidy-up.
- The story's "Playable when" list (play it end to end on a fresh memory-only career, easy and hard) is Claude's to run before announcing.

## Removed

The "Skyline is absent" branch and the second-process spawn in `tools/test-skyline-handling.mjs`, because the switch it tested is now on.
