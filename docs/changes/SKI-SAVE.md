# SKI-SAVE

Heli-skiing's best runs, medals, stashes and what they pay, in the save (docs/HELI_SKIING.md sections 7 and 9). Switch `heli-skiing` (dev); nothing calls these yet (SKI-HELI records runs, SKI-VIEW shows them). This card holds the `save-shape` lock.

## The save

Optional `profile.heli.ski = {version: 1, best: {<run>: number}, medal: {<run>: 1..3}, paid: {<run>: 1..3}, stashes: [<id>]}`, kept inside the helicopter field (`src/heli/heli-save.js`).

- `best`: the lowest time (seconds, to a hundredth) on a timed run (slalom, gs) or the highest score (points, to a tenth) on a judged one (moguls, aerials).
- `medal`: the best medal (1 bronze, 2 silver, 3 gold); `paid`: the highest medal already paid for. Zero entries are not stored. A stored `paid` above `medal` raises `medal` to it (a paid medal was earned).
- `stashes`: the powder stashes found.
- Old saves have no `ski` and never gain one by being read. Names this game does not know (a later game's runs and stashes, such as Tremblant's) are kept as they are, up to 64 each, and never paid. Unknown keys inside a version 1 record are kept as copies. A `ski` record with a newer `version` is returned exactly as it was and every write over it is refused; so is a write over a newer helicopter (`heliOf` reads a newer helicopter as an empty one, so a write would have replaced it).

`skiOf(profile)`, `recordRun(profile, run, {time|points, medal}, {enabled})` and `findStash(profile, id, {enabled})` are new in `heli-save.js`, with `SKI_RUNS`, `SKI_STASHES` and `SKI_MONEY`. A finished run keeps the best value, raises the medal and pays the difference up to it once (150, then 150 more for silver, then 200 more for gold: 500 a run, 2,000 over the four medal runs); a stash pays 100 once, for each of the three (`north-shelf`, `ridge-pocket`, `lower-meadow`, the powder zone's own names). Credits stop at the save's cap. Powder has no result. Switch off (`enabled` not exactly `true`) records and pays nothing and hands back the same profile. The medal is the ski rules' own (`timedMedal`, `judgedMedal`) passed in by the caller: the save accepts only a whole 0 to 3 and refuses a bad time, score or medal; it does not recompute the medal because `src/heli/` may not import the ski zones.

## Tests

`tools/test-heli-ski-save.mjs` (13 tests): the pay table and names equal the design and the powder zone; every older fixture's helicopter reads as nothing skied and gains no record; a medal pays once and only the difference, straight to gold pays 500 once, the four runs pay 2,000; the best is the lowest time or highest score at a hundredth and a tenth; a stash pays once, three in all, and junk names pay nothing; the switch off records nothing (several non-true values, same profile back); the ski rules' medals (guide times, judged points) pay as above; every kind of bad result is refused with the profile untouched; the credit cap; messy stored records read lawfully, the same twice, with a later game's keys kept and a flood of names cut; a later game's ski record or helicopter is left untouched and writes refused; the record survives the profile's own save and load and nothing else in the helicopter changes; the inputs are frozen and never changed. Mutation checks (the paid mark not kept, gold paying 600, the best backwards, the switch ignored, a newer helicopter overwritten, no cap, a stash paying twice, a paid medal not raising the medal) each make a test fail.

Save checker: `tools/test-save-fixtures.mjs` with the new fixture `tools/fixtures/saves/19-heli-ski.json` (three players: one with a ski record that has a later game's run, stash and key; an older helicopter without one; one with a newer-version ski record). The roster count is 18 to 19 and one check is added: a saved `ski` is kept exactly and an older helicopter gains none. No other assertion changed. `test-heli-save`, `test-progression` and `test-heli-mode` pass unchanged.

## Independent save review

REVIEW

## Lane tier and build

LANE

## Removed

Nothing.
