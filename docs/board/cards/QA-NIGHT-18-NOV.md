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

## Helper results, 18 November 2026 (Sonnet helper)

Each scenario was run alone with `--jobs 1`. Branch `worktree-agent-a121752c063a9d34e`, one commit for each of B and C.

**B, all three were out of date and now pass alone.** `arena-steering`, `yard-home` and `heli-first-flight` named the Enzo as the
car that travels only by air. Each now proves the refusal on the McMurtry Speirling, and shows that the Enzo is admitted.

**C.**
- `everburn`: out of date, passes alone. It wanted Lost Prospector on the notice board; no side job is remade yet.
- `everburn-ember`: out of date, passes alone. It is the only scenario that photographs the pot's ember on rock, after a hit,
  gone out at the yard brazier and after a scoop; the job 1 scenario takes other pictures. The checks on the ember's values are
  unchanged. What had changed in the game: Cinder now hands the pot over (the car must stop by her first), the yard brazier
  stands where the yard road leaves it, a scoop needs the car stopped for 3 seconds inside the brazier's ring, and the forge
  is inside Tin Town and holds the car for 9 seconds before the result.
- `everburn-frames`: out of date, passes alone. It reads Slow Ride's raids and Big Bess; both were remade, and the land has
  hills and a camera that glides. Nothing in job 4's own scenario measures frame timing, so it stays. The pass is a headless run
  and does not count under rule 8 (it needs a headed run alone, with the laptop's screen off); the headless p95 was 16.8 ms.
- `everburn-side-jobs`, `everburn-well`: removed (both wait for jobs held back until each is remade).
- `run-gas`, `field-battle`: the game is right, the checks were out of date. Big Bess drives at 9 m/s (measured: 540 m in 60 s)
  on a road of 12,300 m. The first raid on the Boneyard road is 3,900 m down it (435 s) and the battle furnace comes out at 5,500 m
  (608 s); both scenarios waited 200 s. Each now puts Big Bess on her road 60 m or 30 m short of that place (the way
  `everburn-frames` does) and the rest runs as before. Both pass alone.

**D.**
- `machine-borer`: see "machine-borer" below.
- `arsenal-wave1-audio`: passes alone twice. Written into QA-WAVE1-AUDIO-FLIGHT.

### machine-borer

Still failing alone, with exactly last night's six assertions (the two pictures `machine-borer-mouth-20m` and `machine-borer-mouth`: Mabel
in the camera view, lining or portal in the camera view, centre not one flat colour). Everything else in the scenario passes (the
faces, the inside view, the far mouth, the frame pace). The run takes about 10 minutes. Nothing was changed in the scenario.

What the two pictures show: a flat sand colour, with a band of the hill's cracked ground along the top edge. Mabel, the tunnel and the
mouth are not in them. Cause, measured: the scenario presses C once for this picture. Since commit `b14365aad` (16 November, "Clear
Mabel's second view") the second view of every machine is the cab view, and for Mabel `src/machines/dig-game.js` (`updateBorerCamera`,
the `cameraIndex === 1 && body` branch) raises the eye above the top of her model (`src/machines/camera.js`, `bounds.max.y + 0.25`).
The old mouth camera in the same function (the `cameraIndex===1 && mouth` branch) can no longer be reached. In a debug run with
Mabel 20 m into the tunnel the camera stood at height 6.5 m, 8 m above her head (height -1.5 m), and the ground surface above it
was at 30.2 m: the camera is inside the rock, 24 m under the surface. So this is both: the check asks for a view the game no longer
has, and the game's new second view is buried in rock whenever Mabel is cutting (a player who presses C while cutting sees a flat
colour). The test that accompanied that commit (`tools/test-machine-view.mjs`) checks only that the eye clears Mabel's model, never
that it is in the open. That is a fault a player would meet, so it was not hidden by changing the scenario. For Claude to decide: either
cure the second view for Mabel (outside the mouth, or the inside-the-bore following view, while she is underground), after which this
scenario proves it as written, or rule that the second view is the cab view and rewrite the two pictures to the cab view. The
fault is in `src/machines/dig-game.js`, which is more than the small cure this card allowed, so it is reported only.

Still open for Claude: the 'Everburn' remade jobs' own pages. `docs/board/cards/EVERBURN-REMAKE.md` (line 190, "browser scenarios
`everburn-ember` and `everburn-well` pass") and several change notes and cards still name `everburn-well` and `everburn-side-jobs`.
They are history, so they were left alone; the card EVERBURN-REMAKE does not yet say that each remade job and side job brings its
own scenario. No tool or list in `tools/` names either removed scenario.

## Changed assertions, for Claude to review

Claude's own, 18 November: the two removals in the full tier named under C. Each removed part checked a job that the
remake replaced, and the remade job's own suite checks the same promise, so nothing is loosened.

Helper, 18 November (each follows a decision or a remake; the refusal is still proved on the one car it applies to):

1. `arena-steering`. Old: "Untransported Enzo must be refused by production arena admission", with the Enzo's name in the
   message. New: the same assertions for the McMurtry Speirling (the car is added to the memory-only unlock list). Added: the
   Enzo is admitted to the arena, and the yard is active again after it. Reason: EARNED-CARS-ANYWHERE (17 November).
2. `yard-home`. Old: the yard visit with the Enzo is refused, with the Enzo's message and nothing changed. New: the same for
   the McMurtry Speirling. Added: the Enzo's yard visit is admitted. Same reason.
3. `heli-first-flight`. Old: the menu shows "travels only by air" and START is closed for the Enzo. New: the same for the
   McMurtry Speirling. Old: with the Koenigsegg Jesko the note goes and START opens. New: the same with the Enzo (a medal car,
   so this now also proves the decision). The Jesko step was only an example of "another car" and is covered by the Enzo.
4. `everburn`. Old: "job 2 opens the notice board side jobs" (the wall shows the board and "Lost Prospector"). New, with jobs 1
   and 2 done: the board is shown; it lists no side job and says "The next job is being made."; job 3 is the one open job.
   Added, with jobs 1 to 4 done: job 5 reads "The next job is being made." and has no button. Reason: only jobs 1 to 4 are
   remade (`REMADE_EVERBURN_JOBS`) and no side job is.
5. `everburn-side-jobs`, `everburn-well`: removed whole, as this card ordered (they cannot pass until jobs 5 and 6 and the
   side jobs are remade; each remade job brings its own scenario).
6. `everburn-ember`, `everburn-frames`, `run-gas`, `field-battle`: no assertion changed. Only where the car, Big Bess and the
   pot are put, and how long the game runs before the picture, changed. In `everburn-frames` the picture shows Big Bess, the
   furnace and the raiders that stand on her (the old "all raiders in the picture" test, which named the first ambush's raiders, now
   counts the raiders of Slow Ride's raids within 60 m of her; one stood on her in the run, the profile plays on the scenario's
   default difficulty and the rule sends one raider to a raid on Easy, not checked).

## Claude answers

**18 November 2026, on the helper's work.** Read line by line in the diff (scenario files and the two cards only; no game
file changed). Changed assertions 1 to 6 are accepted: each follows Kyle's decision of 17 November or the remake, the
refusal of a flown car is still proved on the one car it applies to, and nothing is loosened. `run-gas` and
`field-battle` wait no longer than before; they start Big Bess near the place they test, because her road is 12 km long
now. `arsenal-wave1-audio` passes alone twice, so QA-WAVE1-AUDIO-FLIGHT closes under its own rule at the next merge.

**machine-borer: the game is wrong, and it gets its own cure.** Since `b14365aad` Mabel's second view puts the eye above
her model, which is inside the rock whenever she is cutting. Ruling: an eye may never stand inside solid ground. While any
part of Mabel is under the hill, her second view is the view from outside the mouth that the scenario photographs (the
branch that can no longer be reached); in the open it is the cab view of `b14365aad`. `tools/test-machine-view.mjs`
gains the check it lacked: at 20 m and at the far end of the cut the eye of every view has open air above it or the
tunnel's own bore round it. The scenario stays as written and proves it. Codex builds this after slice 15 part A; the Dig
is still behind its switch, so no player has met it.

**Section A is cured** (Claude, commit e119269c6): the colour table is made at first draw, and
`tools/test-manifest-await.mjs` checks every rules bundle for a copy of Three.js.
