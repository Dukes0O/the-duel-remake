# STORY-KOGANE-DUEL: the Night Duel

Card row: `docs/story/kogane-invitation.md` section 12. Lock: `save-shape`. Branch `claude/story-duel`. Not merged.

## What changed

- `src/story/kogane-duel.js` (new):
  - `daichiRival(level)`: Daichi's rival settings, `{car: 'nissan_skyline_gtr_r34', driverId: 'club', upgradeLevel}`. `DAICHI_UPGRADE_LEVEL` is
    Easy 0, Medium 2, Hard 0, and `DAICHI_NITRO_SCALE` gives Hard a nitro share of .65 (the packet's first guess was 0, 1, 2; the measured runs below moved it).
  - `koganeDuelStart(level)`: what "Race Daichi" gives `startCampaign`: `{mode: 'duel', opponentCount: 1, cpuDifficulty, rival, story: 'kogane-night-duel'}`.
  - `levelStart(duel)`: the duel starts level. Call it once, right after `startCampaign`. It moves Daichi from 20 m back to the start line, in his own lane
    (3.4 m from the player's centre). It does nothing unless the rival is the Skyline from the Story card.
  - `settleKoganeDuel(profile, result, {won, stageId})`: the grant rule. Returns `null` unless every condition holds: a valid win (`won`), the mark
    `kogane-night-duel`, the road `kogane-pass-night`, mode `duel`, not practice, qualifying or abandoned, a CPU level whose Daichi settings match the
    rival in the result, a story that is not from a newer game, and the lesson and supplies marks set. Then it adds the Skyline
    (`grantKoganeSkyline`, a no-op when owned) and raises the duel mark (`markKoganeDuel`). If the car is not in the build (switch off) nothing is written.
- `src/progression.js`, `settleRace`: one import, three lines before the `owned` snapshot (so the Skyline is not counted as a medal car), and one line in the
  returned result: `storyDuel` (the level won), and `storyCar` (the car id, when granted) or `storyOwned: true` (when the player already had it).
  It runs after every early return of `settleRace`, so abandoned, practice, duplicate (same `runId:stageIndex`), Summit, Grand Prix and invalid finishes never reach it.
  The pay is the ordinary Rival Duel pay: the grant adds no credits.
- `src/sim-rival.js` and `src/rival-settings.js` (Claude's call of 29 October: option 1 for Hard): an optional rival field `nitroScale`, 0 up to but not including 1.
  A custom rival with it keeps that share of the nitro's top-speed gain and of its extra pull while boosting. Absent (every other rival, every saved setup),
  `normalizeRival` returns exactly what it did, and the rival code takes the same arithmetic path (the speed gain is used as is; the pull is multiplied by 1).
  Only the story's Hard Daichi sets it. Easy and Medium Daichi do not.
- `tools/test-story-kogane-duel.mjs` (new): 103 checks in the lane tier (rules, plus a short race check), and `--rates` runs for the curve.

## Tests

- `node tools/test-story-kogane-duel.mjs`: 103 checks pass. Settings by level; the grant on the Night road; the pay is unchanged; the story changes only the car list
  and the story mark; a duplicate finish; and no grant for: no mark, another mark, a loss, abandoned (also one that claims a win), unfinished, bad time, timeout,
  wrong lap count, practice, qualifying, a practice road, the day road, a road that does not exist, time trial, Grand Prix, another tuning level, rival car or
  driver, no rival, a level that does not match, an unknown level, a player without the lesson or the supplies mark, a story from a newer game (kept exactly).
  A win while owning the Skyline changes only the duel mark and says `storyOwned`. A harder win raises the mark; an easier one later does not lower it.
  The short race check: the lesson-pace driver beats Easy Daichi; each level's Daichi alone finishes the road without a stop and without a hit at the first hairpin.
- The Night road does not exist yet (KOGANE-PASS-C7). The grant rules use a stand-in road that carries its id. **The curve was proved on the day road
  `kogane-pass`** (same 4,684 m, same four hairpins, same walls). The runner picks `kogane-pass-night` by itself once it is in the circuit list; run it again then.

## The curve: how it was measured, and why the driver varies

A duel has no chance in it. The road has no traffic, Daichi drives the same every time, and the seed changes nothing. So 30 seeded duels of one fixed driver would be one race
thirty times (all wins or all losses). The 30 duels therefore differ in the **driver**: the test driver (the racing-line driver the circuit tests use, Stuttgart 959-S,
Casual) takes its skill from the seeded generator, spread evenly (one per slice) from **.80 to 1.00** of the line. .95 is the circuit tests' value, 1.00 is the line
at its limit, .80 is a careful learner. The lesson-pace driver is the same driver spread from .88 to .96 (about 92%), ten duels. That range is my choice, not the packet's.
Every race starts level. Daichi drives the real Skyline. Nitro is left on (the rival's standard rule).

Run it with `node tools/test-story-kogane-duel.mjs --rates easy|medium|hard|lesson` (about 1.5 minutes each; add `--upgrade N`, `--skill X` or `--no-nitro` to explore).

Daichi alone on the road (seconds; the player stays 40 m behind so the catch-up rule is neutral). The driver takes 103 to 117 s on this road:

| Tuning level | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| 0 | **140.4** | 115.4 | **102.8** |
| 1 | 134.2 | 111.9 | 97.5 |
| 2 | 127.7 | **105.5** | 93.8 |
| 3 | 126.6 | 105.0 | 93.5 |

30 duels, win rate for the driver (tuning level in brackets); the chosen setting is in bold:

| Level | Target | Result |
| --- | --- | --- |
| Easy | 85 to 100% | **100% (30 of 30) at tuning 0** |
| Lesson-pace driver on Easy | at least 9 of 10 | **10 of 10** at tuning 0, nitro left on |
| Medium | 35 to 60% | tuning 1: 80%; **tuning 2: 37% (11 of 30)**; tuning 3: 30% |
| Hard | 10 to 30% | **tuning 0, nitro share .65: 23% (7 of 30)**. Full nitro: tuning 0 3%, tuning 1 0%, tuning 2 0% (the packet's start) |

- **Nitro on Easy.** The lesson-pace driver wins Easy 10 of 10 with nitro on (Daichi alone takes 140 s against the driver's 106 to 110 s), so by the Decided 29 October rule Daichi
  keeps his nitro on Easy. No sim code was changed for it.
- **Daichi finishes at least 95% and never crashes at the first hairpin:** in all 130 duels and every solo run, Daichi crossed the line or was still running at the end with no stop
  (30 of 30 on each level, 10 of 10 lesson), with **0 hits and 0 resets at the first hairpin (Cedar Hairpin)** and 0 resets anywhere. He does scrape walls elsewhere: about 2 to 3 hits a race
  on every level (a hit is a wall or roadside contact that cuts his speed by a tenth or more).
- The Medium result is close to its lower edge; a 30-duel sample moves about 9 points, so 37% is inside the band but not by much.

## Hard

With the tuning level alone Hard could not reach 10 to 30%: untuned Hard Daichi drives the road in 102.8 s, and the best driver in the range takes 103.3 s (3% at best, 0% at the packet's level 2).
Turning nitro off swung it the other way (about 47 to 50%). Claude chose a reduced nitro for Hard Daichi only (`nitroScale`, above). Measured at tuning 0, 30 duels each:

| Nitro share | Daichi alone | Driver wins |
| ---: | ---: | ---: |
| 1.00 (full) | 102.8 s | 3% |
| .75 | 104.6 s | 0% (first try, before the pull was scaled; the later runs below scale both) |
| .70 | 104.6 s | 17% |
| .65 | 104.9 s | **23% (7 of 30), chosen** |
| .60 | 105.2 s | 23% |
| .50 | 104.9 s | 27% |
| .30 | 107.0 s | 47% |
| 0 (none) | 108.9 s | about 47% to 50% (tuning 1 and 2) |

The first sweep scaled only the top-speed gain and barely moved Daichi (he is held by the route planner's corner speeds; the boost matters on the straights through its push), so the share
now scales the push as well. The `.75` row is from that first version and is shown only for the record.

## Hooks for the next card (STORY-KOGANE-HOOKS owns `src/app.js` and `src/game.js`)

- Call `koganeDuelStart(level)` and spread it into `startCampaign`; call `levelStart(duel)` right after it. Pass `story` into the result payload (`settleRace` reads `result.story` and `result.rival`,
  and the payload already carries `rival: state.rivalSettings`). `settleRace` returns `storyDuel`, `storyCar` or `storyOwned` for the results card.
- The grant needs `stageId === 'kogane-pass-night'`. The day road never grants.

## Changed assertions

None. No existing test was edited. No shared number (`CPU_DIFFICULTY`, `DIFFICULTY`, any course or fingerprint file) was touched. The lane tier's replay and world-signature guards pass unchanged after the `nitroScale` edit.

## Checks

- `node tools/test-story-kogane-duel.mjs`: 103 checks pass.
- `node tools/run-tests.mjs --tier lane --changed --jobs 2`: 202 passed, 0 failed after the nitroScale edit (replay and world-signature guards included, unchanged). `npm run build`: passes (the existing chunk-size and dynamic-import warnings only).
- `--rates easy`, `--rates medium`, `--rates hard` and `--rates lesson` all pass their bands (100%, 37%, 23%, 10 of 10). They are not part of the lane tier (about 1.5 minutes each).

## Removed

Nothing is removed. The packet's first guess for Daichi's tuning (0, 1, 2) is replaced by the measured values above.

## Claude's review (28 October 2026, night)

Independent review: approve, no faults (ordinary races settle unchanged, grant cannot be farmed, nitroScale absent is bit-for-bit identical, replays 270 pass). Curve on the day road: Easy 100%, lesson 10/10, Medium 37%, Hard 23% (nitro share .65, Claude's call). For HOOKS: restart must keep story and call levelStart; never save the story rival as the player's setup; rivalSignature ignores nitroScale; rerun the curve on kogane-pass-night.
