UNFINISHED: Hard cannot meet its 10 to 30% band with the card's levers (the tuning level, 0 to 3). It wins 3% at best. Claude to decide (section "Open for Claude" below). The lane tier and the build are listed at the end. The hooks for the Story card ("Race Daichi", the level start, the payload fields) belong to STORY-KOGANE-HOOKS.

# STORY-KOGANE-DUEL: the Night Duel

Card row: `docs/story/kogane-invitation.md` section 12. Lock: `save-shape`. Branch `claude/story-duel`. Not merged.

## What changed

- `src/story/kogane-duel.js` (new):
  - `daichiRival(level)`: Daichi's rival settings, `{car: 'nissan_skyline_gtr_r34', driverId: 'club', upgradeLevel}`. `DAICHI_UPGRADE_LEVEL` is
    Easy 0, Medium 2, Hard 0 (the packet's first guess was 0, 1, 2; the measured runs below moved it).
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
- `tools/test-story-kogane-duel.mjs` (new): 98 checks in the lane tier (rules, plus a short race check), and `--rates` runs for the curve.

## Tests

- `node tools/test-story-kogane-duel.mjs`: 98 checks pass. Settings by level; the grant on the Night road; the pay is unchanged; the story changes only the car list
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
| Hard | 10 to 30% | **tuning 0: 3% (1 of 30)**; tuning 1: 0%; tuning 2: 0% (the packet's start) |

- **Nitro on Easy.** The lesson-pace driver wins Easy 10 of 10 with nitro on (Daichi alone takes 140 s against the driver's 106 to 110 s), so by the Decided 29 October rule Daichi
  keeps his nitro on Easy. No sim code was changed for it.
- **Daichi finishes at least 95% and never crashes at the first hairpin:** in all 130 duels and every solo run, Daichi crossed the line or was still running at the end with no stop
  (30 of 30 on each level, 10 of 10 lesson), with **0 hits and 0 resets at the first hairpin (Cedar Hairpin)** and 0 resets anywhere. He does scrape walls elsewhere: about 2 to 3 hits a race
  on every level (a hit is a wall or roadside contact that cuts his speed by a tenth or more).
- The Medium result is close to its lower edge; a 30-duel sample moves about 9 points, so 37% is inside the band but not by much.

## Open for Claude: Hard

Hard cannot reach 10 to 30% with the tuning level alone. Even untuned (level 0, his slowest), Hard Daichi drives the road in 102.8 s, while the best driver in the range (skill 1.00) takes 103.3 s. So
only a near-perfect driver ever wins (3%). The packet's level 2 never loses a race (0%). I committed level 0, the closest. The levers I did not use because they are outside this card:

1. **No nitro for Daichi on Hard** (an experiment, `--no-nitro`): Daichi alone takes 108.9 s untuned or 106.4 s at level 1, and the driver wins 47% at level 1 and 50% at level 2.
   That swings from 3% to about 50%, so it overshoots the band. It would need a second, smaller setting (for example a lower nitro level than the other tuning). The same switch on Medium would be too kind (his time rises from 105.5 to 119.3 s).
2. **A slower Hard cruise only for the story rival**: a new rival field in `_rival` (`src/sim-rival.js`) that the card does not own.
3. **Accept Hard as a near-perfect-driver duel** (3%). The packet says Hard 10 to 30% for the test driver, so I did not choose this myself.

The other two numbers in your list also come from my choice of driver range. If you would rather the usual driver be fixed at .95, every level is then all wins (Easy, Medium) or all losses (Hard) with these settings.

## Hooks for the next card (STORY-KOGANE-HOOKS owns `src/app.js` and `src/game.js`)

- Call `koganeDuelStart(level)` and spread it into `startCampaign`; call `levelStart(duel)` right after it. Pass `story` into the result payload (`settleRace` reads `result.story` and `result.rival`,
  and the payload already carries `rival: state.rivalSettings`). `settleRace` returns `storyDuel`, `storyCar` or `storyOwned` for the results card.
- The grant needs `stageId === 'kogane-pass-night'`. The day road never grants.

## Changed assertions

None. No existing test was edited. No shared number (`CPU_DIFFICULTY`, `DIFFICULTY`, any course or fingerprint file) was touched.

## Checks

- `node tools/test-story-kogane-duel.mjs`: 98 checks pass.
- Lane tier and build: see the result line added by the last commit below.

## Removed

Nothing is removed. The packet's first guess for Daichi's tuning (0, 1, 2) is replaced by the measured values above.
