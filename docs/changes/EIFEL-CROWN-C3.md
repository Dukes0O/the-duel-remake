# EIFEL-CROWN-C3: pace for the new Eifel road

Status: partly done. The computer drivers finish every race and rarely crash, but Easy and
Medium crashes are one or two over the limit, Medium wins are above the written band, and the reference lap is built but not yet published
(see "Open"). Switch: `eifel-crown` stays `dev`; the released Eifel is untouched.

## Changed

- `src/race-field.js`: a Grand Prix row for the new road, `eifel-crown@3` (layoutVersion 3).
  `courseForGrandPrix` looks for the `id@layoutVersion` row first and falls back to the
  `id` row, so the released Eifel keeps its old row (.934 / .903 / .881) until the switch is
  flipped. New row: field pace Easy .94, Medium .858, Hard .86, aggression 1.4 as before, and
  more room to the car ahead (`fieldFollow`: reaction .4 s, margin 3.5 m, comfort .5, lead
  braking 1.6, and the first-lap care Harbour and Tremblant use). The old row can go when the
  old entry is removed at C7.
- `tools/test-circuit-eifel.mjs`: `node tools/test-circuit-eifel.mjs --pace [easy|medium|hard]
  [--races N]` runs the seeded field races (30 per difficulty, `--races` only for tuning) on
  the new road in slot 9. Stock Stuttgart 959-S, club driver, skill .95 along the racing line
  (as `tools/ardennes-field-rate.mjs` does), seven computer cars, memory-only saves. It
  asserts: every computer finishes in at least 29 of 30 races, at most 1 computer crash per 10
  races, first-lap pile-ups and finish share as in `race-field-balance.mjs`, and the player's
  win rate in Easy 60 to 80%, Medium 40 to 50%, Hard 15 to 25%. Those bands are where the
  written Grand Prix targets (`docs/CIRCUITS.md` 3.2: 60-80, 30-50, 10-25) and the brief
  (60-80, 40-60, 15-35) overlap; I found no other course with different written numbers.
  The three-passes-per-Medium-race target of the packet is printed, not asserted (see Open).
  One new road test checks that the new row follows only the new road.
- `tools/build-reference-laps.mjs`: a course that stands in for a released one behind its
  switch (a `slot`) is now built in the worker where its switch is on. Before, the tool
  quietly rebuilt the released road under the new road's name.

## Why the player driver needed a following limit

The racing-line player driver does not watch the car ahead. In the first trials it drove into
slower cars in the Start Kink and the cars it hit counted as computer crashes (3 to 5 a race
in every setting, whatever the pace). The test gives that driver the same "never drive into
the car ahead in your lane" limit `race-field-balance.mjs` gives its own driver. No shared
driver file changed. With it, and the added room for the field, the crashes come from the
computers themselves and are mostly gone.

## Numbers

Before (released-road row .934 / .903 / .881 on the new road, 8-race trials, racing-line
driver without the following limit): Medium 28 computer crashes in 8 races, player won 3 of 8;
Hard 38 in 8, player won 2 of 8; first-lap pile-up in 1 of 8 on both. With the following limit
added (6 Medium races): 8 crashes, player won 1 of 6.

After, 30 races per difficulty, final row (`.qa-dist` logs, not kept):

| | Easy (.94) | Medium (.858) | Hard (.86) |
| --- | --- | --- | --- |
| Races where all 7 computers finished | 30 of 30 | 30 of 30 | 30 of 30 |
| Computer crashes | 5 in 30 races (limit 3) | 4 in 30 races (limit 3) | 3 in 30 races |
| First-lap pile-ups | 0 | 0 | 0 |
| Player wins | 73% | 57% | 20% |
| Computer passes per race | 1.0 | 1.6 | 2.0 |
| Player race time, 3 laps | 340.5 s mean | 344.3 s mean | 347.6 s mean |

Earlier full runs of the same road: rows .935 / .872 / .865 gave wins 80 / 27 / 10%, crashes
5 / 7 / 4 in 30 races. Rows .94 / .863 / .86 gave Medium 33% wins and 1 crash in 30 races.
Medium .863 was too hard for the player and .858 is too easy (57%, 4 crashes), so the
right Medium value is between them (about .861, **not run**). Medium .858 is left in the row
because it is the value that was measured; it meets the brief's 40 to 60% band, misses the
written 30 to 50% band, and has one crash more than the limit.

Reference lap (Stuttgart 959-S, club driver, Medium, the policy of `docs/CIRCUITS.md` 7b.1) on
the new road, built with `node tools/build-reference-laps.mjs --event=eifel-crown --probe`:
105,600 ms (1:45.6), inside 1:40 to 1:46. The released road's lap is 78,975 ms.

## Gates

- `tools/test-circuit-eifel.mjs`: 11 of 11 pass (the road tests and the new row test).
- `tools/drive-through.mjs --course eifel-crown`: pass, 0 issues.
- `tools/test-circuits.mjs`: 208,982 checks pass with the switch off, 208,978 with it on.
- `tools/test-ground-rows-exact.mjs` and `tools/test-world-composition.mjs`: pass with the
  switch off (40,696 heights; 57 checks), unchanged. With the switch on they differ for Eifel
  as expected (new road scenery); the world signature is regenerated at C7 after a reviewed look.
- Lane tier (`--changed --jobs 2 --keep-going`): 65 passed, 0 failed, 0 not run, 359 s. (An
  earlier run failed `test-tyre-slip` only because I had moved the Eifel replay case out of the
  hash-pinned `recorded-inputs.json`; that move is reverted, see Open 2.)
- `npm run build`: passes.

## Assertions and fingerprints

No existing assertion changed. Other courses' pace rows, fingerprints, signatures and
reference laps are unchanged. The released Eifel's replay fingerprint is unchanged.

## Open

1. **Reference lap not published.** `src/generated/reference-laps/eifel-crown.json` still holds
   the released road. `tools/test-reference-laps.mjs` compares each record with the installed
   road (the released one while the switch is off), and the Team Room reads it for the
   released road, so a new-road record would fail that test and mislead the live game. C7
   publishes it with the switch flip: `node tools/build-reference-laps.mjs --event=eifel-crown`
   now builds the new road (105.6 s). The old record's laps archive with layoutVersion 3 as the
   packet says.
2. **Replay case not moved.** The released Eifel's case (`eifel-crown-duel`) sits in the shared
   `tools/replays/recorded-inputs.json`, which `tools/test-tyre-slip.mjs` pins by hash, and the
   replay guard replays whichever road is installed (the released one while the switch is off).
   A course-owned case for the new road cannot be checked until the switch is on. C7
   re-records it (`node tools/test-replays.mjs --record`), the one fingerprint that moves.
3. **Easy crashes.** 5 computer crashes in 30 races, limit 3. They are cars running wide at
   the Start Kink and First Ess in Easy's mistake rolls. Lower pace gives the player more wins
   than the 80% ceiling, so Easy needs a different lever (a fuller Easy-only follow setting or
   the mistake size), which is a racing change outside this card.
4. **Passes between computers.** 1.0 (Easy), 2.0 (Hard) and 1.6 (Medium) per race against
   the packet's 3 on Medium. The extra room that removed the crashes also removed passes;
   Claude to say which matters more.
5. **Controller.** The field-balance test driver (`installTestDriver`, `LINE_SKILL=.95`) laps
   about 126 s on this road, the racing-line driver about 105 s. Both are used at skill .95;
   this card follows Ardennes and uses the racing-line driver.

## Removed

Nothing replaced. The released-road pace row `eifel-crown` is kept until C7 removes the old
entry. Trial logs inside the lane's ignored `.qa-dist` folder were deleted; the helper scripts
used for tuning sat in Claude's scratchpad folder and were left there.
