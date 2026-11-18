# QA-NIGHT-18-NOV

The full check of 18 November 2026 (commit `42f002f59`) failed on 31 things that are not on the standing list
(`docs/board/checks/night-2026-11-18.md`). It was the first full check to finish since 12 November, so the failures are
six days of merges, not one night's. Claude's card. Claude sorted them by cause on the morning of 18 November; a Sonnet
helper on the laptop repairs the browser scenarios, because Codex's lane jobs cannot start a browser. Rule 13: these
repairs go before other work, and other merges continue.

## Checks

- Each scenario named below, run alone: `node tools/run-browser-scenarios.mjs --scenarios <name> --jobs 1`.
- `node tools/test-old-smoke.mjs`, `node tools/test-run-gas-medium.mjs`, `node tools/test-manifest-await.mjs`.
- The next night's full check, which must run every browser scenario, with no failure off the standing list.

## A. One warning fails 17 picture scenarios (cause found, Claude cures it)

`ardennes-views`, `convoy-raid`, `eifel-views`, `eifel-scenery-views`, `eifel-c5-views`, `kogane-pass`, `kogane-views`,
`kogane-c5-views`, `kogane-finish`, `kogane-night-light`, `p4-panorama`, `release-controls`, `stavelot-stone`,
`story-kogane`, `tollkeeper`, `warlord-cards`, `yeti`. Each took its pictures and failed only on the console warning
"Multiple instances of Three.js being imported", once for each page it loaded.

Cause, measured: each of these scenarios builds a small private bundle of game files and runs it in the page. Since
`ec0f8d34e` (14 November) the rules reach `src/world/tin-town-shacks.js` for the shacks' positions
(`scablands-solids.js` imports `tinTownSolids`), and that file makes its colour table with `new THREE.Color()` when it is
loaded. The bundler cannot drop a call made at load, so every private bundle carries its own copy of Three.js. With the
colour maker marked free of side effects in memory, four such bundles (armour rules, the line driver, the convoy rules,
the walker) hold no Three.js at all, so this is the only cause. Players are not affected: the game's own build holds one
copy.

Cure: the colour table is made when the shacks are first drawn, not when the file is loaded. So that it cannot return,
`tools/test-manifest-await.mjs` (it builds bundles already) gains one check: a bundle of `src/game.js` alone holds no
Three.js. No other new test code.

## B. Out of date after Kyle's decision of 17 November (earned cars race anywhere)

- `arena-steering`: "Untransported Enzo must be refused by production arena admission".
- `yard-home`: "Production Enzo yard refusal or isolation failed".
- `heli-first-flight`: "Timed out waiting for the air-only note on the menu".

EARNED-CARS-ANYWHERE (`bb947ac1d`) took the medal cars off the list of cars that travel only by air; only the McMurtry
Speirling is still flown. Correct each check to the decision as that merge corrected the rule checks: where a scenario
proves that a flown car is refused, the flown car becomes the McMurtry, and a medal car (the Enzo) is shown to be
admitted. Nothing is loosened: the refusal is still proved, on the one car it still applies to.

## C. Out of date after the Everburn's remake (Kyle's ruling of 14 November)

Jobs 1 to 4 were remade and have their own scenarios (`everburn-job1` to `-job4`). Jobs 5 and 6 and the notice board's
side jobs are held back until each is remade (`REMADE_EVERBURN_JOBS`; the wall says "The next job is being made").

- `everburn` ("job 2 opens the notice board side jobs"): correct its screen facts to today's wall: jobs open in turn up
  to job 4, job 5 reads "The next job is being made", the notice board lists only side jobs that have been remade.
- `everburn-ember` ("Timed out waiting for Hot Delivery result"), `everburn-frames` (a TypeError reading `'0'`): find
  what each still proves that `everburn-job1` to `-job4` do not. Keep that part, corrected; remove the rest. If nothing
  is left, remove the scenario.
- `everburn-side-jobs` (waits for Lost Prospector on the notice board), `everburn-well` (waits for job 6 on the wall):
  they cannot pass until those jobs are remade. Remove them; EVERBURN-REMAKE now says that each remade job and side job
  brings its own scenario, as jobs 1 to 4 did.
- `run-gas` ("No raid appeared") and `field-battle` ("The furnace never came out"): the gas run and the battle were not
  remade, so these may be real faults in the game (the land grew on 14 November; the raids' code changed on 17
  November). Run each alone and say which it is, with the evidence. A fault in the game is reported, not cured here,
  unless the cure is small and inside one file.

Full tier, the same cause, cured by Claude on 18 November: `tools/test-old-smoke.mjs` lost its last part (old job 3's
catch by the car; the remade catch is in `tools/test-everburn-job3.mjs`, which checks the note of when the bellows leave
for the furnace sighting), and `tools/test-run-gas-medium.mjs` lost its "Job 4 (Slow Ride)" case and that case's one
assertion (the old escort; the remade job is in `tools/test-everburn-job4.mjs` and `tools/test-everburn-easy.mjs`).

## D. Not yet known

- `machine-borer`: at `machine-borer-mouth` and `machine-borer-mouth-20m`, "Mabel is in the camera view", "tunnel lining
  or portal is in the camera view" and "picture centre is not a flat colour" all failed. Look at the two pictures first.
- `arsenal-wave1-audio`: it has its own card, QA-WAVE1-AUDIO-FLIGHT. Run it once alone and write the result there.

## How the helper works

Thirty minutes at most on each (rule 4), in its own worktree, one browser job at a time (`--jobs 1`; Kyle may be playing
on the laptop). For each scenario say which it is, with the evidence: the game is wrong, the check is out of date, or it
passes alone. Never change a tolerance or an assertion to make a check pass. Every corrected or removed assertion is
written below, old and new, with the reason, for Claude's review before the merge (rule 18).

## Changed assertions, for Claude to review

Claude's own, 18 November: the two removals in the full tier named under C. Each removed part checked a job that the
remake replaced, and the remade job's own suite checks the same promise, so nothing is loosened.

## Claude answers

(none yet)
